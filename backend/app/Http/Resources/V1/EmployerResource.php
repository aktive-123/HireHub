<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->user;

        return [
            'id' => 'emp-'.$this->id,
            'company' => $this->name,
            'logoText' => $this->logo_text,
            'logoBg' => $this->logo_bg,
            'logoColor' => $this->logo_color,
            'contact' => $user?->name,
            'email' => $user?->email,
            'phone' => $user?->phone,
            'industry' => $this->industry,
            'location' => $this->location,
            'size' => $this->size,
            'jobs' => $this->open_jobs_count ?? $this->jobs_count ?? 0,
            'verified' => $this->is_verified,
            'status' => $this->status,
            'joined' => $this->created_at?->format('M j, Y'),
            'last_active' => $this->updated_at?->diffForHumans(),
            'rating' => $this->rating,
        ];
    }
}
