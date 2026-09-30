<?php

namespace App\Models;

use App\Enums\PaymentGateway;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'gateway',
        'event_type',
        'gateway_event_id',
        'attempts',
        'error',
        'processed_at',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'gateway' => PaymentGateway::class,
            'attempts' => 'integer',
            'processed_at' => 'datetime',
            'payload' => 'array',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}
