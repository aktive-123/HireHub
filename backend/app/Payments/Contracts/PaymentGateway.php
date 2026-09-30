<?php

namespace App\Payments\Contracts;

use App\Enums\PaymentGateway as PaymentGatewayProvider;
use App\Models\Company;
use App\Models\Payment;
use App\Models\User;
use App\Payments\Data\CheckoutSession;
use App\Payments\Data\WebhookEvent;
use Illuminate\Http\Request;

/**
 * A charge to present at a gateway, already priced.
 *
 * A gateway does not need to know *why* it is being charged — a subscription
 * and a hiring fee are both just an amount, a currency and a description as far
 * as Paystack is concerned. Bundling them here keeps that knowledge in
 * PaymentService, which is the only layer that knows what a `Payment` is for.
 */
final readonly class ChargeRequest
{
    /**
     * @param  int  $amount  minor units (kobo for NGN)
     * @param  string  $label  shown on the provider's checkout page
     * @param  array<string, string>  $metadata  echoed back to us and stored on the provider
     * @param  string|null  $returnUrl  where the gateway sends the user back to. Null uses
     *                                  the shared `payments.return` route, which lands on the
     *                                  billing page. A hiring fee passes its own so the
     *                                  employer returns to the applicant they were hiring.
     */
    public function __construct(
        public int $amount,
        public string $currency,
        public string $label,
        public string $description = '',
        public array $metadata = [],
        public ?string $returnUrl = null,
    ) {}

    public function returnUrlFor(Payment $payment): string
    {
        return $this->returnUrl ?? route('payments.return', ['reference' => $payment->reference]);
    }
}

/**
 * Contract every payment provider implements.
 *
 * Implementations must never trust an amount supplied by the client: the
 * payable amount is always passed in from the server-side pricing that produced
 * the `Payment` row. They are also responsible for cryptographically verifying
 * their own webhooks, since that signature is the only proof a notification
 * genuinely came from the provider.
 */
interface PaymentGateway
{
    public function name(): PaymentGatewayProvider;

    /**
     * Whether credentials for this gateway are present. Unconfigured
     * gateways are hidden from checkout instead of failing at the last step.
     */
    public function isConfigured(): bool;

    /**
     * Open a hosted checkout for a payment and return where to send the user.
     *
     * $company may be null: a charge is not always made on behalf of a company
     * profile. The gateway only needs it for its own bookkeeping metadata.
     */
    public function createCheckout(
        Payment $payment,
        ChargeRequest $charge,
        User $user,
        ?Company $company,
    ): CheckoutSession;

    /**
     * Verify an incoming webhook's signature and normalise it.
     *
     * Returns null when the signature is absent or invalid — the caller must
     * treat that as a hard rejection, never as a parse failure to ignore.
     */
    public function verifyWebhook(Request $request): ?WebhookEvent;
}
