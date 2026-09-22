<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminJobResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => 'job-'.$this->id,
            'title' => $this->title,
            'company' => $this->company?->name,
            'category' => $this->category?->name,
            'location' => $this->location,
            'type' => $this->employment_type?->value,
            'applications' => $this->applications_count,
            'views' => $this->view_count,
            'status' => $this->status?->value,
            'featured' => $this->is_featured,
            'verified' => $this->is_verified,
            'posted' => $this->posted_at?->diffForHumans(),
            'posted_at' => $this->posted_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'company_id' => $this->company_id,
            'slug' => $this->slug,
        ];
    }
}
