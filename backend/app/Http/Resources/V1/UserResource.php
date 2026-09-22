<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'headline' => $this->headline,
            'avatar_url' => $this->avatar_url,
            'role' => $this->role?->value,
            'status' => $this->status?->value,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'joined' => $this->created_at?->format('M j, Y'),
            'last_active' => $this->updated_at?->diffForHumans(),
        ];
    }
}
