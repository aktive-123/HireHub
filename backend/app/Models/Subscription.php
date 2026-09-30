<?php

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'company_id',
        'plan_id',
        'downgraded_from_plan_id',
        'payment_id',
        'status',
        'gateway',
        'starts_at',
        'current_period_end',
        'trial_ends_at',
        'cancelled_at',
        'expiry_reminder_sent_at',
        'superseded_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'starts_at' => 'datetime',
            'current_period_end' => 'datetime',
            'trial_ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'expiry_reminder_sent_at' => 'datetime',
            'superseded_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * The one live subscription for a company, if any. `superseded_at IS NULL`
     * mirrors the generated unique column, so this can never return two rows.
     */
    public function scopeLive(Builder $query): Builder
    {
        return $query->whereNull('superseded_at');
    }

    public function grantsAccess(): bool
    {
        return $this->status->grantsAccess()
            && ($this->current_period_end === null || $this->current_period_end->isFuture());
    }

    public function onGracePeriod(): bool
    {
        return $this->current_period_end !== null
            && $this->current_period_end->isPast()
            && $this->status === SubscriptionStatus::Active;
    }
}
