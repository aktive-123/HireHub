<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $job_id
 * @property int $seeker_id
 * @property ApplicationStatus|null $status
 * @property int|null $match_score
 * @property Carbon|null $applied_at
 * @property Carbon|null $status_changed_at
 * @property-read Job|null $job
 * @property-read User|null $seeker
 */
class Application extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'seeker_id',
        'status',
        'match_score',
        'cover_letter',
        'cv_path',
        'applied_at',
        'status_changed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ApplicationStatus::class,
            'match_score' => 'integer',
            'applied_at' => 'datetime',
            'status_changed_at' => 'datetime',
        ];
    }

    /**
     * Stamp the pipeline transition, whatever wrote it.
     *
     * Centralised on the model rather than in each controller so the employer
     * and admin status endpoints — and anything added later — all produce the
     * same audit trail. Time-to-hire is derived from this column, so letting one
     * path skip it would quietly corrupt the number.
     */
    protected static function booted(): void
    {
        static::saving(function (self $application): void {
            $status = $application->status?->value;

            $changed = ! $application->exists
                || $application->getOriginal('status') !== $status;

            if ($changed && $status !== null) {
                $application->status_changed_at = now();

                // A brand new application enters the pipeline at "new", and its
                // first transition is the moment it arrived.
                $application->applied_at ??= now();
            }
        });
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    public function seeker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seeker_id');
    }

    /**
     * The placement fee charged for hiring this applicant, if one has been
     * raised. HasOne because `hiring_fees.application_id` is unique: a hire
     * generates exactly one fee.
     */
    public function hiringFee(): HasOne
    {
        return $this->hasOne(HiringFee::class);
    }
}
