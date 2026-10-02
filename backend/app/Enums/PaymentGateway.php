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

    /**
     * The env keys a gateway needs before it can take money. Surfaced in the
     * "not configured" error so whoever clicks a pay button learns which keys
     * to add, instead of being told only that something is missing.
     *
     * @return array<int, string>
     */
    public function configKeys(): array
    {
        return match ($this) {
            self::Paystack => ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'],
            self::Flutterwave => ['FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_PUBLIC_KEY'],
            self::Stripe => ['STRIPE_SECRET_KEY', 'STRIPE_PUBLIC_KEY'],
        };
    }

    public function notConfiguredMessage(): string
    {
        return sprintf(
            'The %s gateway is not configured. Set %s in backend/.env.',
            $this->label(),
            implode(' and ', $this->configKeys()),
        );
    }
}
