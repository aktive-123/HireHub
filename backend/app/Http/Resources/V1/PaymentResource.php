<?php

namespace App\Http\Resources\V1;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property Payment $resource
 *
 * @phpstan-type Serialized array{id: int, reference: string, status: string, status_label: string, gateway: string, gateway_label: string, amount: int, currency: string, purpose: string, purpose_label: string, plan: array{slug: string|null, name: string|null}|null, checkout_url: string|null, paid_at: string|null, expires_at: string|null, created_at: string|null}
 */
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
            // What the money was for. A subscription payment is tied to a plan;
            // a placement fee is priced from hiring_fee_rates and has none. The
            // label is always present so a client never has to infer the purpose
            // from a missing plan.
            'purpose' => $this->resource->purpose->value,
            'purpose_label' => $this->resource->purpose->label(),
            'plan' => $this->whenLoaded('plan', fn () => [
                'slug' => $this->plan?->slug,
                'name' => $this->plan?->name,
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
