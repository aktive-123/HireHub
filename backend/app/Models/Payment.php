<?php

namespace App\Models;

use App\Enums\PaymentGateway;
use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Payments\Contracts\Chargeable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property PaymentPurpose $purpose
 * @property PaymentStatus $status
 * @property PaymentGateway $gateway
 * @property-read Receipt|null $receipt
 * @property-read HiringFee|null $hiringFee
 */
class Payment extends Model implements Chargeable
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'company_id',
        'plan_id',
        'purpose',
        'gateway',
        'status',
        'amount',
        'currency',
        'billing_period',
        'reference',
        'gateway_reference',
        'checkout_url',
        'paid_at',
        'expires_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'gateway' => PaymentGateway::class,
            'status' => PaymentStatus::class,
            'purpose' => PaymentPurpose::class,
            'amount' => 'integer',
            'paid_at' => 'datetime',
            'expires_at' => 'datetime',
            'meta' => 'array',
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

    public function hiringFee(): HasOne
    {
        return $this->hasOne(HiringFee::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(PaymentEvent::class);
    }

    public function receipt(): HasOne
    {
        return $this->hasOne(Receipt::class);
    }

    public function isSettled(): bool
    {
        return $this->status === PaymentStatus::Succeeded;
    }

    public function getReference(): string
    {
        return $this->reference;
    }

    public function getGatewayReference(): ?string
    {
        return $this->gateway_reference;
    }

    public function getChargeDescription(): string
    {
        // Parenthesised deliberately: `.` binds tighter than `??`, so without
        // the brackets the whole concatenation lands on the left of the `??`
        // and the fallback below can never be reached.
        return ($this->plan?->name.' plan')
            ?? ($this->hiringFee ? 'Hiring confirmation fee' : 'HireHub payment');
    }

    public function getAmount(): int
    {
        return (int) $this->amount;
    }

    public function getCurrency(): string
    {
        return (string) $this->currency;
    }

    public function asPayment(): ?Payment
    {
        return $this;
    }
}
