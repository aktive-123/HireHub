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
            'avatar_url' => $this->profilePictureUrl(),
            'role' => $this->role?->value,
            'status' => $this->status?->value,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            // Carried on the resource rather than only in the login response so
            // a page refresh, or a session restored from storage, can still tell
            // that the account is confined and route to the change screen.
            //
            // Via ->resource rather than $this->requiresPasswordChange(): the
            // resource forwards unknown calls to the model at runtime, but
            // saying so explicitly keeps static analysis able to see it.
            'must_change_password' => $this->resource->requiresPasswordChange(),
            'joined' => $this->created_at?->format('M j, Y'),
            'last_active' => $this->updated_at?->diffForHumans(),
        ];
    }
}
