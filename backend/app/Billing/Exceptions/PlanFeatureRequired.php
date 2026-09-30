<?php

namespace App\Billing\Exceptions;

use App\Billing\Entitlement;
use RuntimeException;

/**
 * Thrown when a route is gated behind a capability the current plan does not
 * grant — analytics, exports and the rest.
 *
 * Distinct from PlanLimitReached because the remedy differs: this is not a
 * spent allowance that refills, it is a capability a different plan carries, so
 * the client is pointed at plan selection rather than a usage counter.
 */
class PlanFeatureRequired extends RuntimeException
{
    /**
     * @param  list<string>  $requiredBy  The plan slugs that do grant it.
     */
    public function __construct(
        public readonly Entitlement $entitlement,
        public readonly string $feature,
        string $message,
        public readonly array $requiredBy = [],
    ) {
        parent::__construct($message);
    }

    /**
     * @return array<string, mixed>
     */
    public function context(): array
    {
        return [
            'feature' => $this->feature,
            'granted_by' => $this->requiredBy,
            'usage' => $this->entitlement->toArray(),
        ];
    }
}
