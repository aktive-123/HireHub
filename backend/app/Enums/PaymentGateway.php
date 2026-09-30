<?php

namespace App\Enums;

enum PaymentGateway: string
{
    case Paystack = 'paystack';
    case Flutterwave = 'flutterwave';
    case Stripe = 'stripe';

    public function label(): string
    {
        return match ($this) {
            self::Paystack => 'Paystack',
            self::Flutterwave => 'Flutterwave',
            self::Stripe => 'Stripe',
        };
    }

    /**
     * Currencies the gateway can settle. Validated at checkout so an
     * unsupported pair fails with a clear message instead of a gateway error.
     *
     * @return array<int, string>
     */
    public function supportedCurrencies(): array
    {
        return match ($this) {
            self::Paystack => ['NGN', 'GHS', 'ZAR', 'USD', 'KES'],
            self::Flutterwave => ['NGN', 'GHS', 'ZAR', 'USD', 'KES', 'EUR', 'GBP'],
            self::Stripe => ['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'ZAR', 'KES'],
        };
    }

    public function supportsCurrency(string $currency): bool
    {
        return in_array(strtoupper($currency), $this->supportedCurrencies(), true);
    }
}
