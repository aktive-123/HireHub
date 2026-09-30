<?php

namespace App\Payments\Data;

/**
 * A hosted checkout session. The user is redirected to `url`; no card data
 * ever reaches HireHub, which keeps the platform out of PCI scope.
 */
final readonly class CheckoutSession
{
    public function __construct(
        public string $url,
        public ?string $gatewayReference = null,
        public array $meta = [],
    ) {}
}
