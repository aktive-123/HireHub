<?php

namespace App\Billing;

use App\Models\Plan;
use App\Models\Subscription;

/**
 * A company's plan, resolved against what it has actually used right now.
 *
 * This is the single source of truth for every limit in the product. The
 * dashboard card, the sidebar counter, the paywall copy and the server-side
 * gate that rejects an over-limit request are all rendered from one instance
 * of this object, which is why a number shown to the employer cannot drift
 * from the number the API enforces.
 */
final class Entitlement
{
    /**
     * @param  int  $cvViewsUsed  CV views recorded since the start of the current calendar month.
     * @param  string  $periodEndsAt  ISO-8601 expiry of the current paid period, or null on the free tier.
     */
    public function __construct(
        public readonly Plan $plan,
        public readonly ?Subscription $subscription,
        public readonly int $jobPostsUsed,
        public readonly int $featuredUsed,
        public readonly int $cvViewsUsed,
        public readonly ?string $periodEndsAt = null,
        public readonly ?string $cancelledAt = null,
    ) {}

    public function jobPostsRemaining(): int
    {
        return max(0, $this->plan->job_post_limit - $this->jobPostsUsed);
    }

    public function featuredCreditsRemaining(): int
    {
        return max(0, $this->plan->featured_job_limit - $this->featuredUsed);
    }

    public function cvViewsRemaining(): int
    {
        return max(0, $this->plan->cv_view_limit - $this->cvViewsUsed);
    }

    public function canPostJob(): bool
    {
        return $this->jobPostsRemaining() > 0;
    }

    public function canFeatureJob(): bool
    {
        return $this->featuredCreditsRemaining() > 0;
    }

    public function canViewCv(): bool
    {
        return $this->cvViewsRemaining() > 0;
    }

    /**
     * True when the company is on a plan it paid for. Drives the "Upgrade"
     * call to action and the renewal reminder.
     */
    public function isPaid(): bool
    {
        return ! $this->plan->isFree();
    }

    /**
     * Machine-readable feature gate, read from the plan row rather than
     * inferred from the price, so a plan can grant a capability for free.
     */
    public function allows(string $feature): bool
    {
        return (bool) ($this->plan->entitlements[$feature] ?? false);
    }

    public function status(): string
    {
        return $this->subscription?->status->value ?? 'free';
    }

    /**
     * The wire shape consumed by the employer dashboard card, the sidebar
     * indicators and the paywall modal. Keys are stable: the frontend reads
     * these numbers directly instead of recomputing them.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'plan' => [
                'id' => $this->plan->id,
                'slug' => $this->plan->slug,
                'name' => $this->plan->name,
                'price' => $this->plan->price,
                'price_display' => $this->plan->formattedPrice(),
                'currency' => $this->plan->currency,
                'billing_period' => $this->plan->billing_period,
                'is_free' => $this->plan->isFree(),
                'entitlements' => $this->plan->entitlements ?? [],
            ],
            'status' => $this->status(),
            'is_paid' => $this->isPaid(),
            'is_cancelling' => $this->cancelledAt !== null,
            'period_ends_at' => $this->periodEndsAt,
            'cancelled_at' => $this->cancelledAt,
            'usage' => [
                'job_posts' => [
                    'used' => $this->jobPostsUsed,
                    'limit' => $this->plan->job_post_limit,
                    'remaining' => $this->jobPostsRemaining(),
                ],
                'featured' => [
                    'used' => $this->featuredUsed,
                    'limit' => $this->plan->featured_job_limit,
                    'remaining' => $this->featuredCreditsRemaining(),
                ],
                'cv_views' => [
                    'used' => $this->cvViewsUsed,
                    'limit' => $this->plan->cv_view_limit,
                    'remaining' => $this->cvViewsRemaining(),
                    'resets_on' => now()->addMonthNoOverflow()->startOfMonth()->toIso8601String(),
                ],
            ],
        ];
    }
}
