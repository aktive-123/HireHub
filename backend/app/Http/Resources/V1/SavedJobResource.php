<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SavedJobResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => 'saved-'.$this->id,
            'saved_at' => $this->saved_at?->toIso8601String(),
            'job' => $this->whenLoaded('job', fn () => new JobResource($this->job->loadMissing('company', 'category'))),
        ];
    }
}
