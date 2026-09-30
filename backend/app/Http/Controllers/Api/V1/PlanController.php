<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\PlanResource;
use App\Models\Plan;
use App\Payments\PaymentManager;
use Illuminate\Http\Request;

class PlanController extends ApiController
{
    /**
     * Public pricing catalogue. Only active plans are exposed, and only the
     * fields a visitor legitimately needs to choose a plan.
     */
    public function index(Request $request, PaymentManager $manager)
    {
        $plans = Plan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get();

        return $this->success(
            PlanResource::collection($plans),
            'Plans retrieved.',
            200,
            ['gateways' => $manager->availableWithLabels()]
        );
    }

    public function show(Plan $plan)
    {
        abort_unless($plan->is_active, 404);

        return $this->success(new PlanResource($plan), 'Plan retrieved.');
    }
}
