<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    case Trialing = 'trialing';
    case Active = 'active';
    case PastDue = 'past_due';
    case Cancelled = 'cancelled';
    case Expired = 'expired';

    /**
     * Whether the plan's entitlements (job post allowance, featured slots) are
     * currently usable.
     */
    public function grantsAccess(): bool
    {
        return in_array($this, [self::Trialing, self::Active], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::Trialing => 'Trial',
            self::Active => 'Active',
            self::PastDue => 'Past due',
            self::Cancelled => 'Cancelled',
            self::Expired => 'Expired',
        };
    }
}
