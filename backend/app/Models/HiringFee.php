<?php

namespace App\Models;

use App\Enums\HiringFeeLevel;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Nullable rather than non-nullable because the columns have no NOT NULL
 * guarantee on every write path, and the console reads them defensively with
 * `?->` throughout. Typing them as present would make that defensiveness look
 * like dead code to static analysis, and deleting it would turn a null enum
 * into a fatal on a legacy row.
 *
 * @property PaymentStatus|null $status
 * @property HiringFeeLevel|null $level
 * @property-read Payment|null $payment
 * @property-read Job|null $job
 * @property-read Company|null $company
 *
 * @method bool isSettled()
 */
class HiringFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'employer_id',
        'company_id',
        'job_id',
        'application_id',
        'hiring_fee_rate_id',
        'payment_id',
        'amount',
        'currency',
        'level',
        'percentage_applied',
        'status',
        'reference',
        'paid_at',
        'confirmed_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'percentage_applied' => 'integer',
            'status' => PaymentStatus::class,
            'level' => HiringFeeLevel::class,
            'paid_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(Job::class);
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function rate(): BelongsTo
    {
        return $this->belongsTo(HiringFeeRate::class, 'hiring_fee_rate_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * The single condition that unlocks a hire. Money moved, or it did not.
     */
    public function scopeSettled(Builder $query): Builder
    {
        return $query->where('status', PaymentStatus::Succeeded);
    }

    public function scopeOutstanding(Builder $query): Builder
    {
        return $query->whereIn('status', [PaymentStatus::Pending, PaymentStatus::Processing]);
    }

    /**
     * Alias for {@see self::scopeOutstanding()}. "In progress" reads better at
     * the call site, where the question is whether this fee is still live.
     */
    public function scopeInProgress(Builder $query): Builder
    {
        return $query->outstanding();
    }

    public function isSettled(): bool
    {
        return $this->status === PaymentStatus::Succeeded;
    }
}
