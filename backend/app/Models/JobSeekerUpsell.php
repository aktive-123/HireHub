<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use App\Payments\Contracts\Chargeable;
use App\Services\Upsell\UpsellCatalogue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $application_id
 * @property string $sku
 * @property int $amount
 * @property string $currency
 * @property string $gateway
 * @property string $reference
 * @property string|null $gateway_reference
 * @property string|null $checkout_url
 * @property PaymentStatus $status
 * @property Carbon|null $paid_at
 * @property string|null $error
 */
class JobSeekerUpsell extends Model implements Chargeable
{
    use HasFactory;

    protected $table = 'job_seeker_upsells';

    protected $fillable = [
        'user_id',
        'application_id',
        'sku',
        'amount',
        'currency',
        'gateway',
        'reference',
        'gateway_reference',
        'checkout_url',
        'status',
        'paid_at',
        'error',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'status' => PaymentStatus::class,
            'paid_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function scopeSettled(Builder $query): Builder
    {
        return $query->where('status', PaymentStatus::Succeeded->value);
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
        return UpsellCatalogue::find($this->sku)['name'] ?? 'HireHub add-on';
    }

    public function getAmount(): int
    {
        return (int) $this->amount;
    }

    public function getCurrency(): string
    {
        return (string) $this->currency;
    }

    /**
     * An upsell is never a Payment. The employer-facing receipt system is keyed
     * on those, and an upsell has no company to scope one to.
     */
    public function asPayment(): ?Payment
    {
        return null;
    }
}
