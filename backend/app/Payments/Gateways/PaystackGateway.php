<?php

namespace App\Payments\Gateways;

use App\Enums\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Payment;
use App\Models\User;
use App\Payments\Contracts\ChargeRequest;
use App\Payments\Contracts\PaymentGateway as PaymentGatewayContract;
use App\Payments\Data\CheckoutSession;
use App\Payments\Data\WebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Paystack. Amounts are sent in the currency's minor unit (kobo for NGN).
 */
class PaystackGateway implements PaymentGatewayContract
{
    public function name(): PaymentGateway
    {
        return PaymentGateway::Paystack;
    }

    public function isConfigured(): bool
    {
        return (bool) config('payments.gateways.paystack.secret_key');
    }

    public function createCheckout(Payment $payment, ChargeRequest $charge, User $user, ?Company $company): CheckoutSession
    {
        // The amount was priced server-side before this call. Nothing the client
        // sent reaches Paystack.
        $response = $this->request('https://api.paystack.co/transaction/initialize', [
            'email' => $user->email,
            'amount' => $charge->amount,
            'currency' => $charge->currency,
            'reference' => $payment->reference,
            'callback_url' => $charge->returnUrlFor($payment),
            'metadata' => [
                'payment_id' => $payment->id,
                'label' => $charge->label,
                'company_id' => $company?->id,
                ...$charge->metadata,
            ],
            'channels' => ['card', 'bank', 'ussd', 'mobile_money'],
        ]);

        $data = $response['data'] ?? [];

        if (($response['status'] ?? false) !== true || empty($data['authorization_url'])) {
            throw new RuntimeException($response['message'] ?? 'Paystack could not start the checkout.');
        }

        return new CheckoutSession(
            url: $data['authorization_url'],
            gatewayReference: $data['access_code'] ?? null,
            meta: ['paystack_reference' => $data['reference'] ?? $payment->reference],
        );
    }

    /**
     * Paystack signs the raw request body with HMAC-SHA512 using the secret
     * key and returns it in `x-paystack-signature`.
     */
    public function verifyWebhook(Request $request): ?WebhookEvent
    {
        $signature = $request->header('x-paystack-signature');
        $secret = config('payments.gateways.paystack.secret_key');

        if (! $signature || ! $secret) {
            return null;
        }

        $expected = hash_hmac('sha512', $request->getContent(), $secret);

        // hash_equals keeps the comparison constant-time.
        if (! hash_equals($expected, (string) $signature)) {
            Log::warning('Paystack webhook rejected: signature mismatch.');

            return null;
        }

        return $this->parseEvent($request->json()->all());
    }

    private function parseEvent(array $payload): ?WebhookEvent
    {
        $data = $payload['data'] ?? [];

        // Paystack names this field `event`. Reading `event_type` instead —
        // which is what several other providers use — yields an empty string
        // for every real notification, so every charge.success is discarded and
        // reported to the merchant as a bad signature.
        $eventType = (string) ($payload['event'] ?? '');

        $status = match (true) {
            $eventType === 'charge.success' && ($data['status'] ?? '') === 'success' => PaymentStatus::Succeeded,
            $eventType === 'charge.failed' => PaymentStatus::Failed,
            default => null,
        };

        if ($status === null) {
            // A signed notification for an event we do not act on. Null keeps
            // it away from the state machine: guessing a status here would let
            // an unrelated event such as a settlement notification mark a real
            // charge as failed.
            return null;
        }

        return new WebhookEvent(
            gateway: $this->name(),
            type: $eventType,
            status: $status,
            reference: $data['reference'] ?? null,
            // Paystack sends no per-event id; the reference plus the event type
            // is stable for a given charge and is what dedupes replays.
            eventId: isset($data['reference']) ? $data['reference'].':'.$eventType : null,
            amount: isset($data['amount']) ? (int) $data['amount'] : null,
            currency: isset($data['currency']) ? strtoupper((string) $data['currency']) : null,
            payload: $payload,
        );
    }

    private function request(string $url, array $payload): array
    {
        $response = Http::withToken((string) config('payments.gateways.paystack.secret_key'))
            ->acceptJson()
            ->asJson()
            ->timeout(20)
            ->retry(2, 250)
            ->post($url, $payload);

        return $response->json() ?? [];
    }
}
