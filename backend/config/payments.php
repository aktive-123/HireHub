<?php

return [

    /*
    |---------------------------------------------------------------------------
    | Default gateway
    |---------------------------------------------------------------------------
    |
    | The gateway used when the client does not request one, and the one shown
    | first on the pricing page. Paystack is the primary market.
    |
    */

    'default' => env('PAYMENT_GATEWAY', 'paystack'),

    /*
    |---------------------------------------------------------------------------
    | Currency
    |---------------------------------------------------------------------------
    |
    | All plan amounts are stored in the currency's minor unit (kobo for NGN,
    | cents for USD) as integers. Never store money as a float.
    |
    */

    'currency' => env('PAYMENT_CURRENCY', 'NGN'),

    /*
    |---------------------------------------------------------------------------
    | Checkout lifetime
    |---------------------------------------------------------------------------
    |
    | How long an initialised payment may sit unpaid before it is considered
    | abandoned, and how long a checkout session stays valid.
    |
    */

    'payment_expiry_minutes' => (int) env('PAYMENT_EXPIRY_MINUTES', 60),

    /*
    |---------------------------------------------------------------------------
    | Rate limiting
    |---------------------------------------------------------------------------
    |
    | Checkout initialisation creates a payment row and a gateway session, so
    | it is rate limited per user to keep a third-party integration from being
    | used to exhaust the gateway quota.
    |
    */

    'rate_limits' => [
        'initialize' => env('PAYMENT_RATE_LIMIT_INITIALIZE', 10),
        'initialize_decay_minutes' => (int) env('PAYMENT_RATE_LIMIT_INITIALIZE_DECAY', 10),
    ],

    'gateways' => [

        'paystack' => [
            'secret_key' => env('PAYSTACK_SECRET_KEY'),
            'public_key' => env('PAYSTACK_PUBLIC_KEY'),
            // No webhook secret, unlike Stripe's `whsec_`. Paystack signs each
            // notification with HMAC SHA512 over the raw body using the SECRET
            // KEY, so there is no second value to configure. See
            // PaystackGateway::verifyWebhook().
        ],

        'flutterwave' => [
            'secret_key' => env('FLUTTERWAVE_SECRET_KEY'),
            'public_key' => env('FLUTTERWAVE_PUBLIC_KEY'),
            'webhook_secret' => env('FLUTTERWAVE_SECRET_HASH'),
        ],

        'stripe' => [
            'secret_key' => env('STRIPE_SECRET_KEY'),
            'public_key' => env('STRIPE_PUBLIC_KEY'),
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
            'webhook_tolerance' => (int) env('STRIPE_WEBHOOK_TOLERANCE', 300),
        ],

    ],

];
