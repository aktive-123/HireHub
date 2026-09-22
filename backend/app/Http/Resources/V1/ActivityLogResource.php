<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => 'log-'.$this->id,
            'actor' => $this->actor_name,
            'action' => $this->action,
            'target' => $this->target_name,
            'type' => $this->level,
            'time' => $this->created_at?->diffForHumans(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
