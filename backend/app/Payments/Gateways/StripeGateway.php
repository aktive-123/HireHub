<?php

namespace App\Payments\Gateways;

use App\Enums\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\User;
use App\Payments\Contracts\Chargeable;
use App\Payments\Contracts\ChargeRequest;
use App\Payments\Contracts\PaymentGateway as PaymentGatewayContract;
use App\Payments\Data\CheckoutSession;
use App\Payments\Data\WebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Stripe Checkout. Stripe expects a form-encoded body and a webhook signature
 * carrying a timestamp, which is replay-checked against a tolerance window.
 */
class StripeGateway implements PaymentGatewayContract
{
    public function name(): PaymentGateway
    {
        return PaymentGateway::Stripe;
    }

    public function isConfigured(): bool
    {
        return (bool) config('payments.gateways.stripe.secret_key')
            && (bool) config('payments.gateways.stripe.webhook_secret');
    }

    public function createCheckout(Chargeable $chargeable, ChargeRequest $charge, User $user, ?Company $company): CheckoutSession
    {
        $response = $this->postForm('https://api.stripe.com/v1/checkout/sessions', [
            'mode' => 'payment',
            'client_reference_id' => $chargeable->getReference(),
            'customer_email' => $user->email,
            'success_url' => $charge->returnUrlFor($chargeable->getReference()).($charge->returnUrl ? '&status=success' : ''),
            'cancel_url' => $charge->returnUrlFor($chargeable->getReference()).($charge->returnUrl ? '&status=cancelled' : ''),
            'line_items' => [[
                // price_data is built from the server-side amount, not from
                // request input.
                'price_data' => [
                    'currency' => strtolower($charge->currency),
                    'unit_amount' => $charge->amount,
                    'product_data' => [
                        'name' => $charge->label,
                        'description' => $charge->description ?: $charge->label,
                    ],
                ],
                'quantity' => 1,
            ]],
            'metadata' => [
                'payment_id' => $chargeable->asPayment()?->id,
                'company_id' => (string) ($company?->id ?? ''),
                ...$charge->metadata,
            ],
        ]);

        $data = $response['data'] ?? [];

        if (empty($data['url'])) {
            throw new RuntimeException($data['error']['message'] ?? 'Stripe could not start the checkout.');
        }

        return new CheckoutSession(
            url: $data['url'],
            gatewayReference: $data['id'] ?? null,
            meta: ['stripe_session' => $data['id'] ?? null],
        );
    }

    /**
     * `Stripe-Signature` is `t=<timestamp>,v1=<hmac>`. The signed payload is
     * "<timestamp>.<raw body>", and the timestamp guards against replay: an
     * otherwise-valid signature outside the tolerance is refused.
     */
    public function verifyWebhook(Request $request): ?WebhookEvent
    {
        $header = $request->header('stripe-signature');
        $secret = config('payments.gateways.stripe.webhook_secret');

        if (! $header || ! $secret) {
            return null;
        }

        $timestamp = $this->signedTimestamp($header);

        if ($timestamp === null) {
            return null;
        }

        if (abs(time() - $timestamp) > (int) config('payments.gateways.stripe.webhook_tolerance', 300)) {
            Log::warning('Stripe webhook rejected: timestamp outside tolerance.');

            return null;
        }

        $body = $request->getContent();
        $expected = hash_hmac('sha256', $timestamp.'.'.$body, $secret);

        $valid = false;
        foreach ($this->signatures($header) as $candidate) {
            // hash_equals and a full match: never break early on a partial
            // compare, which would leak timing information.
            if (hash_equals($expected, $candidate)) {
                $valid = true;
            }
        }

        if (! $valid) {
            Log::warning('Stripe webhook rejected: signature mismatch.');

            return null;
        }

        return $this->parseEvent($request->json()->all());
    }

    private function parseEvent(array $payload): ?WebhookEvent
    {
        $object = $payload['data'] ?? [];
        $eventType = (string) ($payload['type'] ?? '');

        $status = match ($eventType) {
            'checkout.session.completed' => ($object['payment_status'] ?? '') === 'paid'
                ? PaymentStatus::Succeeded
                : PaymentStatus::Processing,
            'checkout.session.async_payment_succeeded' => PaymentStatus::Succeeded,
            'checkout.session.expired', 'payment_intent.payment_failed' => PaymentStatus::Failed,
            default => null,
        };

        if ($status === null) {
            return null;
        }

        return new WebhookEvent(
            gateway: $this->name(),
            type: $eventType,
            status: $status,
            reference: $object['client_reference_id'] ?? null,
            eventId: isset($payload['id']) ? (string) $payload['id'] : null,
            amount: isset($object['amount_total']) ? (int) $object['amount_total'] : null,
            currency: isset($object['currency']) ? strtoupper((string) $object['currency']) : null,
            payload: $payload,
        );
    }

    private function signedTimestamp(string $header): ?int
    {
        foreach (explode(',', $header) as $part) {
            [$key, $value] = array_pad(explode('=', trim($part), 2), 2, null);
            if ($key === 't' && ctype_digit((string) $value)) {
                return (int) $value;
            }
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    private function signatures(string $header): array
    {
        $found = [];

        foreach (explode(',', $header) as $part) {
            [$key, $value] = array_pad(explode('=', trim($part), 2), 2, null);
            if ($key === 'v1' && is_string($value)) {
                $found[] = $value;
            }
        }

        return $found;
    }

    private function postForm(string $url, array $payload): array
    {
        $response = Http::withToken((string) config('payments.gateways.stripe.secret_key'))
            ->asForm()
            ->acceptJson()
            ->timeout(20)
            ->retry(2, 250)
            ->post($url, $this->flatten($payload));

        return $response->json() ?? [];
    }

    /**
     * Stripe's form encoding uses bracket notation for nested values.
     */
    private function flatten(array $payload, string $prefix = ''): array
    {
        $out = [];

        foreach ($payload as $key => $value) {
            $name = $prefix === '' ? (string) $key : $prefix.'['.$key.']';

            if (is_array($value)) {
                $out += $this->flatten($value, $name);
            } else {
                $out[$name] = (string) $value;
            }
        }

        return $out;
    }
}
