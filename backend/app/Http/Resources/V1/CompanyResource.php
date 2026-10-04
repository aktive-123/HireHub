<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'verified' => $this->is_verified,
            'logoText' => $this->logo_text,
            'logoBg' => $this->logo_bg,
            'logoColor' => $this->logo_color,
            'industry' => $this->industry,
            'location' => $this->location,
            'address_line' => $this->address_line,
            'city' => $this->city,
            'state' => $this->state,
            'size' => $this->size,
            'founded' => $this->founded,
            'website' => $this->website,
            'rating' => $this->rating,
            'reviews_count' => $this->reviews_count,
            'open_jobs_count' => $this->open_jobs_count,
            'is_featured' => $this->is_featured,
            'is_verified' => $this->is_verified,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'jobs' => $this->whenLoaded('jobs', fn () => JobResource::collection($this->jobs)),
        ];
    }
}
