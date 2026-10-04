<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InterviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => 'int-'.$this->id,
            'applicant' => $this->seeker?->name,
            'seeker' => [
                'id' => $this->seeker_id,
                'name' => $this->seeker?->name,
                'email' => $this->seeker?->email,
                'phone' => $this->seeker?->phone,
                'avatar_url' => $this->seeker?->profilePictureUrl(),
            ],
            'role' => $this->job?->title,
            'job' => [
                'id' => $this->job_id,
                'title' => $this->job?->title,
                'slug' => $this->job?->slug,
            ],
            'application_id' => $this->application_id ? 'app-'.$this->application_id : null,
            'when' => $this->scheduled_at?->format('D, M j · g:i A'),
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'duration_minutes' => $this->duration_minutes,
            'mode' => $this->mode,
            'link' => $this->link,
            'location' => $this->location,
            'notes' => $this->notes,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
