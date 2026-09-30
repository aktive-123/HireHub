<?php

namespace App\Billing\Exceptions;

use App\Billing\Entitlement;
use RuntimeException;

/**
 * Thrown when a company has spent the allowance its plan grants.
 *
 * This is the server-side half of the paywall. The HTTP 403 and the
 * `plan_limit_reached` code are the contract: the client opens the upgrade
 * modal because the API said so, not because it guessed from a number it
 * happened to have cached. The full usage block travels with the error so the
 * modal can state the real remaining count without a second request.
 */
class PlanLimitReached extends RuntimeException
{
    public function __construct(
        public readonly Entitlement $entitlement,
        public readonly string $resource,
        string $message,
    ) {
        parent::__construct($message);
    }

    /**
     * @return array<string, mixed>
     */
    public function context(): array
    {
        return [
            'resource' => $this->resource,
            'usage' => $this->entitlement->toArray(),
        ];
    }
}
