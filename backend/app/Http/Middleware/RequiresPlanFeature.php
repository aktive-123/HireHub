<?php

namespace App\Http\Middleware;

use App\Billing\Exceptions\PlanFeatureRequired;
use App\Billing\PlanEntitlements;
use App\Models\Plan;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route gate for capabilities that only some plans carry — analytics, exports.
 *
 * The decision is read from the `entitlements` column on the plan row the
 * company is actually on, resolved by PlanEntitlements from live subscription
 * data. Nothing here trusts the frontend: the route simply does not run.
 *
 * Attached after `role:employer`, which is what guarantees a company exists to
 * resolve a plan for.
 */
class RequiresPlanFeature
{
    public function __construct(protected PlanEntitlements $entitlements) {}

    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $company = $request->user()?->company;

        // No company means there is nothing to bill, so there is nothing to
        // gate. The employer console already refuses a profile-less account
        // with a 422 on its own endpoints.
        if (! $company) {
            return $next($request);
        }

        $entitlement = $this->entitlements->forCompany($company);

        if ($entitlement->allows($feature)) {
            return $next($request);
        }

        throw new PlanFeatureRequired(
            entitlement: $entitlement,
            feature: $feature,
            message: $this->messageFor($feature, $entitlement->plan->name),
            requiredBy: Plan::query()
                ->where('is_active', true)
                ->whereNotNull('entitlements')
                ->get()
                ->filter(fn (Plan $plan) => (bool) ($plan->entitlements[$feature] ?? false))
                ->pluck('slug')
                ->values()
                ->all(),
        );
    }

    protected function messageFor(string $feature, string $currentPlan): string
    {
        $label = ucwords(str_replace('_', ' ', $feature));

        return "{$label} is not included on the {$currentPlan} plan. Upgrade to unlock it.";
    }
}
