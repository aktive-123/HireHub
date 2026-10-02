<?php

namespace App\Payments\Contracts;

use App\Models\Payment;

/**
 * Anything a gateway can charge and later be reconciled against by reference.
 *
 * Exists so the gateway contract is not welded to one table. There are two
 * kinds of money here — an employer's subscription or hiring fee, and a job
 * seeker's add-on — and they share every gateway integration, every webhook
 * verification path and every amount check. Modelling that with a type that
 * only `Payment` satisfies would have meant either faking a Payment row per
 * upsell (a company-scoped table holding a row with no company, which every
 * employer-facing query would then have to defend against) or a second copy of
 * each gateway.
 *
 * The interface is deliberately the smallest thing that makes a charge
 * resolvable afterwards: an id to correlate on, and the reference the buyer
 * sees and the provider echoes back.
 */
interface Chargeable
{
    /**
     * Our own reference for this charge, shown to the buyer and echoed back by
     * the provider. Unique per chargeable kind.
     */
    public function getReference(): string;

    /**
     * The provider's own identifier for the charge, once checkout has opened.
     */
    public function getGatewayReference(): ?string;

    /**
     * Human-readable description used in the provider's dashboard and
     * reconciliation. Not shown to the buyer.
     */
    public function getChargeDescription(): string;

    public function getAmount(): int;

    public function getCurrency(): string;

    /**
     * @return Payment|null the underlying payment, when this charge is one
     */
    public function asPayment(): ?Payment;
}
