<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'tagline' => $this->tagline,
            'price' => $this->price,
            'price_display' => $this->formattedPrice(),
            'currency' => $this->currency,
            'billing_period' => $this->billing_period,
            'job_post_limit' => $this->job_post_limit,
            'featured_job_limit' => $this->featured_job_limit,
            'cv_view_limit' => $this->cv_view_limit,
            'is_featured' => $this->is_featured,
            'is_free' => $this->isFree(),
            'features' => $this->features ?? [],
            // Published so the pricing page can mark which tier unlocks a
            // gated capability, instead of the copy and the enforced list
            // being maintained separately and drifting apart.
            'entitlements' => $this->entitlements ?? [],
        ];
    }
}
