<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SeekerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $profile = $this->profile;

        return [
            'id' => 'sk-'.$this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'headline' => $this->headline,
            'location' => $profile?->location,
            'years' => $profile?->years_experience,
            'notice' => $profile?->notice_period,
            'status' => $this->status?->value,
            'joined' => $this->created_at?->format('M j, Y'),
            'last_active' => $this->updated_at?->diffForHumans(),
            'applications_count' => $this->applications_count ?? null,
            'saved_jobs_count' => $this->saved_jobs_count ?? null,
        ];
    }
}
