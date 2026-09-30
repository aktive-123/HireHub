<?php

namespace App\Billing;

use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\Job;
use App\Models\Plan;
use App\Models\Subscription;
use RuntimeException;

/**
 * Resolves what a company is entitled to and what it has consumed.
 *
 * Every limit in the product is decided here, from the database, on each call.
 * The result is deliberately not memoised: the dashboard card, the sidebar
 * counter and the gate that rejects an over-limit write must all agree with the
 * rows as they are at that moment, and a request-scoped cache is exactly the
 * kind of thing that makes a freshly upgraded plan still read as "Free" for
 * the rest of the page.
 */
class PlanEntitlements
{
    public const FREE_SLUG = 'free';

    /**
     * Action slug written to the activity log every time an employer opens a
     * candidate CV. The monthly allowance is a count of these rows, which is
     * what makes the number on the billing page an actual measurement of use
     * rather than a figure maintained by hand.
     */
    public const CV_VIEW_ACTION = 'application.cv_viewed';

    public function forCompany(?Company $company): Entitlement
    {
        if (! $company) {
            throw new RuntimeException('A company profile is required to resolve a plan.');
        }

        $subscription = Subscription::query()
            ->where('company_id', $company->id)
            ->live()
            ->with('plan')
            ->latest('id')
            ->first();

        // A paid row only entitles while it is genuinely inside its paid
        // period. Once `current_period_end` has passed the company falls back
        // to the free tier on this very request, rather than waiting for the
        // nightly downgrade command to rewrite the row — a limit must never
        // depend on a cron tick that has not fired yet.
        $paid = $subscription?->grantsAccess() === true && $subscription->plan !== null;

        $plan = $paid ? $subscription->plan : $this->freePlan();

        return new Entitlement(
            plan: $plan,
            subscription: $paid ? $subscription : null,
            jobPostsUsed: $this->jobPostsUsed($company),
            featuredUsed: $this->featuredUsed($company),
            cvViewsUsed: $this->cvViewsUsed($company),
            periodEndsAt: $paid ? $subscription->current_period_end?->toIso8601String() : null,
            cancelledAt: $paid ? $subscription->cancelled_at?->toIso8601String() : null,
        );
    }

    /**
     * The fallback tier. Cached per process only because it is a single row
     * keyed by a unique slug and is read on every entitlement check.
     */
    protected ?Plan $freePlan = null;

    public function freePlan(): Plan
    {
        return $this->freePlan ??= Plan::query()
            ->where('slug', self::FREE_SLUG)
            ->first()
            // A missing free plan is a deployment fault, not a user error: every
            // company would silently have no limits at all. Fail loudly.
            ?? throw new RuntimeException('The "free" plan is missing. Run `php artisan db:seed --class=PlanSeeder`.');
    }

    /**
     * Every non-deleted job the company has posted occupies a slot, whatever
     * its status. The limit is on posting, not on being open, so a company that
     * closes ten jobs still cannot post an eleventh — but deleting one frees
     * the slot immediately, which is the behaviour an employer expects.
     */
    protected function jobPostsUsed(Company $company): int
    {
        return Job::query()->where('company_id', $company->id)->count();
    }

    protected function featuredUsed(Company $company): int
    {
        return Job::query()
            ->where('company_id', $company->id)
            ->where('is_featured', true)
            ->count();
    }

    /**
     * CV views this calendar month, scoped to the account that owns the
     * company. Month-scoped so the allowance genuinely refreshes.
     */
    protected function cvViewsUsed(Company $company): int
    {
        return ActivityLog::query()
            ->where('user_id', $company->user_id)
            ->where('action', self::CV_VIEW_ACTION)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();
    }
}
