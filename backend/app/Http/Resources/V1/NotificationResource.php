<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = is_array($this->data) ? $this->data : [];

        return [
            'id' => $this->id,
            'category' => $data['category'] ?? 'platform',
            'text' => $data['text'] ?? '',
            'action' => $data['action'] ?? null,
            'link' => $data['link'] ?? null,
            'type' => $data['type'] ?? $data['category'] ?? 'info',
            'icon' => $data['icon'] ?? null,
            'time' => $this->created_at?->diffForHumans(),
            'created_at' => $this->created_at?->toIso8601String(),
            'unread' => $this->read_at === null,
            'read_at' => $this->read_at?->toIso8601String(),
        ];
    }
}
