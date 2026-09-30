<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'gateway' => $this->gateway->value,
            'gateway_label' => $this->gateway->label(),
            'amount' => $this->amount,
            'currency' => $this->currency,
            'plan' => $this->whenLoaded('plan', fn () => [
                'slug' => $this->plan->slug,
                'name' => $this->plan->name,
            ]),
            'checkout_url' => $this->when(
                in_array($this->status->value, ['pending', 'processing'], true),
                fn () => $this->checkout_url
            ),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
