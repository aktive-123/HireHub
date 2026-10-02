<?php

namespace Database\Seeders;

use App\Enums\PaymentGateway;
use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Gives a few demo employers a real, in-period subscription.
 *
 * Without this every seeded company resolves to the free tier, whose
 * `featured_job_limit` is 0. The job seeder still marks jobs featured for the
 * sake of a populated landing page, so the employer console then reported
 * "Featured slots 1/0" — one slot used against an allowance of none. The
 * arithmetic was right; the demo data was over its own limit.
 *
 * Seeding a subscription fixes it at the source instead of hiding it: the
 * featured jobs become legitimately affordable, the allowance reads 1/10 rather
 * than 1/0, and the billing page gains a settled subscription payment that
 * carries a real plan name, which is what the Payment History table needs to
 * show something other than a dash.
 *
 * Requires PlanSeeder to have run first — every row here is priced and limited
 * from the plan table.
 */
class SubscriptionSeeder extends Seeder
{
    public function run(): void
    {
        $companies = [
            ['company' => 'Google', 'plan' => 'business', 'days_ago' => 24],
            ['company' => 'Paystack', 'plan' => 'professional', 'days_ago' => 9],
            ['company' => 'Flutterwave', 'plan' => 'professional', 'days_ago' => 3],
        ];

        foreach ($companies as $entry) {
            $company = Company::where('name', $entry['company'])->first();
            $plan = Plan::where('slug', $entry['plan'])->first();

            // A missing company or plan is a seeding-order fault, not something
            // to paper over with a null row: a subscription with no plan has no
            // limits to grant, so it would reintroduce the very bug above.
            if (! $company || ! $plan) {
                $this->command->warn("Skipped subscription for {$entry['company']}: company or plan missing.");

                continue;
            }

            $paidAt = now()->subDays($entry['days_ago']);

            // The payment is written first because the subscription points back
            // at it, and `reference` is the stable key both sides are matched on.
            $payment = Payment::updateOrCreate(
                ['reference' => 'hhsub_seed_'.strtolower($entry['company'])],
                [
                    'user_id' => $company->user_id,
                    'company_id' => $company->id,
                    'plan_id' => $plan->id,
                    'purpose' => PaymentPurpose::Subscription,
                    'gateway' => PaymentGateway::Paystack,
                    'status' => PaymentStatus::Succeeded,
                    'amount' => $plan->price,
                    'currency' => $plan->currency ?? 'NGN',
                    'billing_period' => $plan->billing_period ?? 'monthly',
                    'gateway_reference' => 'SEED-SUB-'.Str::upper(Str::random(10)),
                    'paid_at' => $paidAt,
                    'meta' => ['seeded' => true],
                ]
            );

            // Matched on company_id rather than a unique reference because the
            // generated `active_company_id` column only guarantees uniqueness
            // among live rows — a superseded row would let a second live one in.
            $existing = Subscription::query()
                ->where('company_id', $company->id)
                ->whereNull('superseded_at')
                ->first();

            if ($existing) {
                $existing->update([
                    'plan_id' => $plan->id,
                    'payment_id' => $payment->id,
                    'status' => SubscriptionStatus::Active,
                    'current_period_end' => $paidAt->copy()->addMonth(),
                ]);

                continue;
            }

            Subscription::create([
                'user_id' => $company->user_id,
                'company_id' => $company->id,
                'plan_id' => $plan->id,
                'payment_id' => $payment->id,
                'status' => SubscriptionStatus::Active,
                'gateway' => PaymentGateway::Paystack->value,
                // Started before the payment date would ever read as a period
                // that began before the employer paid for it.
                'starts_at' => $paidAt,
                'current_period_end' => $paidAt->copy()->addMonth(),
            ]);
        }
    }
}
