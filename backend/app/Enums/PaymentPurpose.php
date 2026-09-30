<?php

namespace App\Enums;

enum PaymentPurpose: string
{
    case Subscription = 'subscription';
    case HiringFee = 'hiring_fee';

    public function label(): string
    {
        return match ($this) {
            self::Subscription => 'Subscription',
            self::HiringFee => 'Hiring fee',
        };
    }
}
