<?php

namespace App\Console\Commands;

use App\Billing\PlanEntitlements;
use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Subscription;
use App\Support\Notifier;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Nightly reconciliation of paid subscriptions.
 *
 * Two jobs in one sweep, because they read the same column:
 *
 *  1. Warn companies whose paid period ends within the reminder window, once
 *     per period.
 *  2. Move companies whose period has already ended onto the free plan, in the
 *     database, and tell them.
 *
 * This is the backstop, not the gate. PlanEntitlements already stops honouring
 * a paid plan the instant `current_period_end` passes, so nobody gets paid
 * entitlements from a missed run. What this adds is the durable record — the
 * superseded row, the new free row, and the notification — so the billing
 * history and the in-app inbox agree with reality even if the scheduler is
 * never wired up.
 */
class ReconcileSubscriptions extends Command
{
    protected $signature = 'subscriptions:reconcile
                            {--remind-days=3 : Days before expiry to send the reminder}
                            {--dry-run : Report what would change without writing}';

    protected $description = 'Warn employers about expiring plans and downgrade expired ones to Free.';

    public function handle(PlanEntitlements $entitlements): int
    {
        $remindDays = max(0, min(30, (int) $this->option('remind-days')));
        $dryRun = (bool) $this->option('dry-run');

        $reminded = $this->sendExpiryReminders($remindDays, $dryRun);
        $downgraded = $this->downgradeExpired($entitlements, $dryRun);

        $this->info("Reminders sent: {$reminded}. Subscriptions downgraded: {$downgraded}.");

        return self::SUCCESS;
    }

    /**
     * Companies on a paid plan whose period ends inside the window and who have
     * not already been told about this period.
     */
    protected function sendExpiryReminders(int $remindDays, bool $dryRun): int
    {
        $now = now();
        $cutoff = $now->copy()->addDays($remindDays);

        $due = Subscription::query()
            ->live()
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '>', $now)
            ->where('current_period_end', '<=', $cutoff)
            ->whereNull('expiry_reminder_sent_at')
            ->with(['plan', 'company', 'user'])
            ->get();

        $sent = 0;

        foreach ($due as $subscription) {
            if ($subscription->plan?->isFree()) {
                continue;
            }

            $sent++;

            if ($dryRun) {
                $this->line("  would remind company #{$subscription->company_id} about {$subscription->plan->name} ending {$subscription->current_period_end}");

                continue;
            }

            // Whole calendar days, not a truncated duration: a period ending
            // in 47 hours is "in 1 day" to a human reading an email, and
            // `diffInDays` would say 1 while the copy implied more time than
            // is left. Comparing start-of-day makes the number in the email
            // match the number of days actually remaining.
            $days = (int) $now->startOfDay()->diffInDays($subscription->current_period_end->copy()->startOfDay());

            Notifier::send($subscription->user, [
                'category' => 'billing',
                'type' => 'warning',
                'icon' => 'bi-clock-history',
                'title' => 'Your plan ends soon',
                'text' => $days === 0
                    ? "Your {$subscription->plan->name} plan ends today. Renew to keep your job posting and featured job allowances."
                    : "Your {$subscription->plan->name} plan ends in {$days} day".($days === 1 ? '' : 's').' ('.$subscription->current_period_end->toFormattedDateString().'). Renew to keep your job posting and featured job allowances.',
                'action' => 'Renew plan',
                'link' => '/employer/billing',
                'subject' => "Your {$subscription->plan->name} plan ends in {$days} day".($days === 1 ? '' : 's'),
            ]);

            // Stamped after the send so a crash mid-notification retries
            // rather than silently losing the email.
            $subscription->forceFill(['expiry_reminder_sent_at' => now()])->save();
        }

        return $sent;
    }

    /**
     * Every live paid subscription whose period has passed becomes an explicit
     * free subscription. Written as a new row rather than an edit so the paid
     * period keeps its own row and the billing history stays intact.
     */
    protected function downgradeExpired(PlanEntitlements $entitlements, bool $dryRun): int
    {
        $expired = Subscription::query()
            ->live()
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<=', now())
            ->with(['plan', 'company', 'user'])
            ->get();

        if ($expired->isEmpty()) {
            return 0;
        }

        try {
            $freePlan = $entitlements->freePlan();
        } catch (Throwable $e) {
            // Without a free plan there is nothing to downgrade to. Say so
            // loudly rather than half-migrating companies onto no limits.
            $this->error('The free plan is missing; cannot downgrade. Run: php artisan db:seed --class=PlanSeeder');

            return 0;
        }

        $count = 0;

        foreach ($expired as $subscription) {
            $count++;

            if ($dryRun) {
                $this->line("  would downgrade company #{$subscription->company_id} from {$subscription->plan?->name} to {$freePlan->name}");

                continue;
            }

            $this->downgrade($subscription, $freePlan);
        }

        return $count;
    }

    protected function downgrade(Subscription $subscription, Plan $freePlan): void
    {
        $planName = $subscription->plan?->name ?? 'your paid plan';
        $user = $subscription->user;
        $company = $subscription->company;

        DB::transaction(function () use ($subscription, $freePlan, $company): void {
            // Re-read under the lock: a renewal webhook may have landed between
            // the query and here, in which case this row is no longer expired
            // and must be left alone.
            $locked = Subscription::query()->whereKey($subscription->id)->lockForUpdate()->first();

            if (! $locked || $locked->superseded_at !== null) {
                return;
            }

            if ($locked->current_period_end === null || $locked->current_period_end->isFuture()) {
                return;
            }

            $locked->update([
                'status' => SubscriptionStatus::Expired,
                'superseded_at' => now(),
                'downgraded_from_plan_id' => $locked->plan_id,
            ]);

            if ($company && $locked->plan_id !== $freePlan->id) {
                Subscription::create([
                    'user_id' => $locked->user_id,
                    'company_id' => $locked->company_id,
                    'plan_id' => $freePlan->id,
                    'downgraded_from_plan_id' => $locked->plan_id,
                    'status' => SubscriptionStatus::Active,
                    'gateway' => null,
                    // A free subscription has no billing period, so it is never
                    // itself due for expiry and the sweep ignores it.
                    'starts_at' => now(),
                    'current_period_end' => null,
                ]);
            }
        });

        // Sent only if the transaction above actually moved the row; the
        // early returns mean the employer kept their plan, so there is nothing
        // to tell them about.
        if ($subscription->fresh()?->superseded_at === null) {
            return;
        }

        Log::info('Subscription expired; company downgraded to the free plan.', [
            'subscription_id' => $subscription->id,
            'company_id' => $subscription->company_id,
            'from_plan' => $subscription->plan_id,
        ]);

        Notifier::send($user, [
            'category' => 'billing',
            'type' => 'warning',
            'icon' => 'bi-arrow-down-circle',
            'title' => 'Your plan has ended',
            'text' => "Your {$planName} plan has ended and your account is now on the Free plan. Upgrade again at any time to restore your job posting and featured job allowances.",
            'action' => 'View plans',
            'link' => '/pricing',
            'subject' => "Your {$planName} plan has ended",
        ]);
    }
}
