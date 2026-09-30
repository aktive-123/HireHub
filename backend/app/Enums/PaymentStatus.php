<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Processing = 'processing';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';

    /**
     * Terminal states never transition again. Used to make webhook handling
     * idempotent: replaying a "charge.success" event for an already-succeeded
     * payment must not re-apply the entitlement.
     */
    public function isFinal(): bool
    {
        return in_array($this, [self::Succeeded, self::Failed, self::Cancelled, self::Refunded], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Processing => 'Processing',
            self::Succeeded => 'Paid',
            self::Failed => 'Failed',
            self::Cancelled => 'Cancelled',
            self::Refunded => 'Refunded',
        };
    }
}
