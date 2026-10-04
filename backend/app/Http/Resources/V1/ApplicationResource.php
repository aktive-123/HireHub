<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApplicationResource extends JsonResource
{
    public function period(?string $start, ?string $end, bool $current): string
    {
        if ($current) {
            return trim($start.' — Present');
        }

        if (! $start && ! $end) {
            return '';
        }

        return trim(($start ?? 'Unknown').' — '.($end ?? 'Unknown'));
    }

    public function toArray(Request $request): array
    {
        $profile = $this->seeker?->profile;

        return [
            'id' => 'app-'.$this->id,
            'job_id' => $this->job_id,
            'job' => $this->job?->title,
            'job_slug' => $this->job?->slug,
            'company' => $this->job?->company?->name,
            'seeker_id' => $this->seeker_id,
            'name' => $this->seeker?->name,
            'avatar_url' => $this->seeker?->profilePictureUrl(),
            'role' => $profile?->headline,
            'applied' => $this->applied_at?->format('d M'),
            'applied_at' => $this->applied_at?->toIso8601String(),
            'match' => $this->match_score,
            'status' => $this->status?->value,
            // The label is the enum's own wording rather than the client
            // re-deriving it from the value, so `offer_confirmed_pending_acceptance`
            // does not have to be spelled out in three frontends.
            'status_label' => $this->status?->label(),
            // The seeker's timeline needs a real date per stage. Without this
            // the applications page had nowhere to read one from and fell back
            // to hardcoded ones.
            'status_changed_at' => $this->status_changed_at?->toIso8601String(),
            'status_changed_label' => $this->status_changed_at?->format('d M Y'),
            'has_cv' => (bool) ($this->cv_path ?? $this->seeker?->profile?->cv_path),
            'email' => $this->seeker?->email,
            'phone' => $this->seeker?->phone,
            'location' => $profile?->location,
            'years' => $profile?->years_experience,
            'notice' => $profile?->notice_period,
            'summary' => $profile?->summary,
            'skills' => $profile?->skills ?? [],
            'certifications' => $profile?->certifications ?? [],
            'portfolio' => $profile?->portfolio ?? [],
            'experience' => $profile?->experiences?->map(fn ($item) => [
                'role' => $item->role,
                'org' => $item->organization,
                'period' => $this->period($item->start_date, $item->end_date, (bool) $item->current),
                'text' => $item->description,
            ]) ?? [],
            'education' => $profile?->educations?->map(fn ($item) => [
                'school' => $item->school,
                'degree' => $item->degree,
                'period' => $this->period($item->start_date, $item->end_date, false),
            ]) ?? [],
        ];
    }
}
