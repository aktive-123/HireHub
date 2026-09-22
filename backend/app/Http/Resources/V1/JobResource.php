<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobResource extends JsonResource
{
    public static function salaryAmount(?float $amount): int|float|null
    {
        if ($amount === null) {
            return null;
        }

        return $amount == (int) $amount ? (int) $amount : $amount;
    }

    public function workplaceLabel(string $value): string
    {
        return match ($value) {
            'remote' => 'Remote',
            'hybrid' => 'Hybrid',
            default => 'On-site',
        };
    }

    public function employmentTypeLabel(string $value): string
    {
        return match ($value) {
            'full-time' => 'Full-time',
            'part-time' => 'Part-time',
            'contract' => 'Contract',
            'internship' => 'Internship',
            default => ucfirst($value),
        };
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'location' => $this->location,
            'workplace' => $this->workplaceLabel($this->workplace->value),
            'employment_type' => $this->employmentTypeLabel($this->employment_type->value),
            'level' => $this->level,
            'category' => $this->category?->name,
            'tags' => $this->tags ?? [],
            'posted_days_ago' => $this->posted_at ? max(0, (int) $this->posted_at->diffInDays(now())) : null,
            'status' => $this->status?->value,
            'is_featured' => $this->is_featured,
            'is_verified' => $this->is_verified,
            'views' => $this->view_count,
            'applications_count' => $this->applications_count,
            'description' => $this->description,
            'responsibilities' => $this->responsibilities ?? [],
            'requirements' => $this->requirements ?? [],
            'benefits' => $this->benefits ?? [],
            'salary' => [
                'min' => self::salaryAmount($this->salary_min),
                'max' => self::salaryAmount($this->salary_max),
                'currency' => $this->salary_currency,
                'period' => $this->salary_period,
            ],
            'company' => $this->whenLoaded('company', fn () => [
                'id' => $this->company->id,
                'slug' => $this->company->slug,
                'name' => $this->company->name,
                'verified' => $this->company->is_verified,
                'logoText' => $this->company->logo_text,
                'logoBg' => $this->company->logo_bg,
                'logoColor' => $this->company->logo_color,
            ]),
            'posted_at' => $this->posted_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
