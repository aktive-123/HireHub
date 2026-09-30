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
 * Flutterwave. Amounts are sent in the currency's minor unit (kobo for NGN).
 */
class FlutterwaveGateway implements PaymentGatewayContract
{
    public function name(): PaymentGateway
    {
        return PaymentGateway::Flutterwave;
    }

    public function isConfigured(): bool
    {
        return (bool) config('payments.gateways.flutterwave.secret_key');
    }

    public function createCheckout(Payment $payment, ChargeRequest $charge, User $user, ?Company $company): CheckoutSession
    {
        $response = Http::withToken((string) config('payments.gateways.flutterwave.secret_key'))
            ->acceptJson()
            ->asJson()
            ->timeout(20)
            ->retry(2, 250)
            ->post('https://api.flutterwave.com/v3/payments', [
                'txnt_x' => $payment->reference,
                'amount' => $charge->amount,
                'currency' => $charge->currency,
                'redirect_url' => $charge->returnUrlFor($payment),
                'payment_options' => 'card,banktransfer,ussd,mobilemoney',
                'customer' => [
                    'email' => $user->email,
                    'name' => $user->name,
                ],
                'custom_fields' => [
                    'payment_id' => $payment->id,
                    'label' => $charge->label,
                    'company_id' => $company?->id,
                    ...$charge->metadata,
                ],
                'meta' => ['checkout_id' => $payment->reference],
            ]);

        $data = $response->json() ?? [];

        if (($data['status'] ?? null) !== 'success' || empty($data['data']['link'])) {
            throw new RuntimeException($data['message'] ?? 'Flutterwave could not start the checkout.');
        }

        return new CheckoutSession(
            url: $data['data']['link'],
            gatewayReference: (string) ($data['data']['id'] ?? ''),
            meta: ['txnt_x' => $data['data']['txnt_x'] ?? $payment->reference],
        );
    }

    /**
     * Flutterwave sends `verif-hash`, an HMAC-SHA512 of the secret key over the
     * five event fields joined together. The timestamp is part of the signed
     * string, which is what makes the hash unforgeable.
     */
    public function verifyWebhook(Request $request): ?WebhookEvent
    {
        $provided = $request->header('verif-hash');
        $secret = config('payments.gateways.flutterwave.secret_key');

        if (! $provided || ! $secret) {
            return null;
        }

        $payload = $request->json()->all();

        $signed = implode('', [
            (string) ($payload['data']['tx_ref'] ?? ''),
            (string) ($payload['data']['amount'] ?? ''),
            (string) ($payload['data']['currency'] ?? ''),
            (string) ($payload['data']['timestamp'] ?? ''),
            (string) ($payload['event'] ?? ''),
        ]);

        $expected = hash_hmac('sha512', $signed, $secret);

        if (! hash_equals($expected, (string) $provided)) {
            Log::warning('Flutterwave webhook rejected: signature mismatch.');

            return null;
        }

        return $this->parseEvent($payload);
    }

    private function parseEvent(array $payload): ?WebhookEvent
    {
        $data = $payload['data'] ?? [];
        $eventType = (string) ($payload['event'] ?? '');

        $status = match (true) {
            $eventType === 'charge.completed' && ($data['status'] ?? '') === 'successful' => PaymentStatus::Succeeded,
            in_array($eventType, ['charge.failed', 'payment_declined'], true) => PaymentStatus::Failed,
            default => null,
        };

        if ($status === null) {
            return null;
        }

        return new WebhookEvent(
            gateway: $this->name(),
            type: $eventType,
            status: $status,
            reference: $data['tx_ref'] ?? null,
            eventId: isset($data['id']) ? (string) $data['id'].':'.$eventType : null,
            amount: isset($data['amount']) ? (int) $data['amount'] : null,
            currency: isset($data['currency']) ? strtoupper((string) $data['currency']) : null,
            payload: $payload,
        );
    }
}
