<?php

namespace App\Payments\Data;

use App\Enums\PaymentGateway;
use App\Enums\PaymentStatus;

/**
 * A normalised gateway notification, independent of each provider's payload
 * shape. `eventId` must be the provider's stable identifier for the event so
 * replays can be rejected.
 */
final readonly class WebhookEvent
{
    public function __construct(
        public PaymentGateway $gateway,
        public string $type,
        public PaymentStatus $status,
        public ?string $reference,
        public ?string $eventId = null,
        public ?int $amount = null,
        public ?string $currency = null,
        public array $payload = [],
    ) {}

    public function isSettlement(): bool
    {
        return $this->status === PaymentStatus::Succeeded;
    }
}
