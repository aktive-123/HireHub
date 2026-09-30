<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'grants_access' => $this->grantsAccess(),
            'on_grace_period' => $this->onGracePeriod(),
            'gateway' => $this->gateway,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'current_period_end' => $this->current_period_end?->toIso8601String(),
            'trial_ends_at' => $this->trial_ends_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'plan' => $this->whenLoaded('plan', fn () => new PlanResource($this->plan)),
        ];
    }
}
