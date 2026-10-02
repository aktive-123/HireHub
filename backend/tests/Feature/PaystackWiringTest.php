<?php

namespace Tests\Feature;

use App\Enums\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Payments\Gateways\PaystackGateway;
use App\Payments\PaymentManager;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\ApiTestCase;

/**
 * The Paystack integration is wired to the provider, not to a placeholder.
 *
 * The failure this file exists to prevent is subtle: an integration that
 * returns a plausible-looking checkout URL from a local stub, or one that
 * throws before ever making a request, will pass any test that only checks the
 * happy path. So these assert the *outbound request* — the URL, the auth
 * header, the body — because that is the only part that proves a real
 * transaction is possible.
 */
class PaystackWiringTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        Http::fake([
            'api.paystack.co/transaction/initialize' => Http::response([
                'status' => true,
                'data' => [
                    'authorization_url' => 'https://checkout.paystack.com/hh_live_shape',
                    'access_code' => 'acc_shape',
                    'reference' => 'hh_shape',
                ],
            ]),
        ]);
    }

    public function test_with_no_keys_the_gateway_reports_itself_unconfigured(): void
    {
        config(['payments.gateways.paystack.secret_key' => null]);

        $this->assertFalse(app(PaystackGateway::class)->isConfigured());
        $this->assertFalse(app(PaymentManager::class)->isAvailable('paystack'));
    }

    /**
     * The message has to tell whoever clicks the button what to actually do.
     * "not configured" with no variable names sends people looking in the wrong
     * file.
     */
    public function test_the_unconfigured_error_names_the_env_keys_to_set(): void
    {
        config(['payments.gateways.paystack.secret_key' => null]);

        $employer = $this->employer();
        $plan = $this->plan('business');

        $this->asApiUser($employer)
            ->postJson('/api/v1/employer/billing/checkout', [
                'plan' => $plan->slug,
                'gateway' => 'paystack',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m): bool => str_contains($m, 'PAYSTACK_SECRET_KEY')
                && str_contains($m, 'PAYSTACK_PUBLIC_KEY'));

        Http::assertNothingSent();
    }

    public function test_an_unconfigured_gateway_is_never_offered_as_a_payment_option(): void
    {
        config(['payments.gateways.paystack.secret_key' => null]);

        $this->assertSame([], app(PaymentManager::class)->available());
    }

    public function test_a_configured_gateway_posts_to_paystack_with_the_expected_shape(): void
    {
        config(['payments.gateways.paystack.secret_key' => 'sk_test_shape']);

        $employer = $this->employer();
        $plan = $this->plan('business');

        $this->asApiUser($employer)
            ->postJson('/api/v1/employer/billing/checkout', [
                'plan' => $plan->slug,
                'gateway' => 'paystack',
            ])
            ->assertCreated()
            ->assertJsonPath('data.checkout_url', 'https://checkout.paystack.com/hh_live_shape');

        $expectedAmount = (int) $plan->price;
        $expectedCurrency = $plan->currency;
        $expectedEmail = $employer->email;

        Http::assertSent(function (ClientRequest $request) use ($expectedAmount, $expectedCurrency, $expectedEmail): bool {
            if (! str_contains($request->url(), 'api.paystack.co/transaction/initialize')) {
                return false;
            }

            // Real credentials on the wire, bearer-style as Paystack documents.
            $this->assertSame('Bearer sk_test_shape', $request->header('Authorization')[0] ?? null);

            $body = $request->data();

            // The amount must be the server's figure. A client that could set
            // the amount would be able to buy a Business plan for ₦1.
            $this->assertSame($expectedAmount, $body['amount']);
            $this->assertSame($expectedCurrency, $body['currency']);
            $this->assertSame($expectedEmail, $body['email']);
            $this->assertArrayHasKey('reference', $body);
            $this->assertArrayHasKey('callback_url', $body);

            return true;
        });
    }

    public function test_a_client_supplied_amount_is_rejected_because_the_server_prices_it(): void
    {
        config(['payments.gateways.paystack.secret_key' => 'sk_test_shape']);

        $employer = $this->employer();
        $plan = $this->plan('business');

        $this->asApiUser($employer)
            ->postJson('/api/v1/employer/billing/checkout', [
                'plan' => $plan->slug,
                'gateway' => 'paystack',
                'amount' => 1,
                'currency' => 'USD',
            ])
            // Rejected outright rather than silently ignored, so a client
            // integrating against this API learns the field is not theirs to set.
            ->assertStatus(422);

        Http::assertNothingSent();
    }

    public function test_the_paystack_gateway_is_the_default_gateway(): void
    {
        $this->assertSame(PaymentGateway::Paystack->value, config('payments.default'));
    }

    public function test_the_webhook_signature_is_verified_before_anything_is_granted(): void
    {
        $employer = $this->employer();
        $plan = $this->plan('business');

        $payment = Payment::create([
            'user_id' => $employer->id,
            'company_id' => $this->companyOf($employer)->id,
            'plan_id' => $plan->id,
            'gateway' => 'paystack',
            'status' => PaymentStatus::Pending,
            'amount' => $plan->price,
            'currency' => $plan->currency,
            'billing_period' => $plan->billing_period,
            'reference' => 'hh_unsigned_probe',
        ]);

        $body = json_encode([
            'event' => 'charge.success',
            'data' => [
                'reference' => $payment->reference,
                'amount' => $plan->price,
                'currency' => 'NGN',
                'status' => 'success',
            ],
        ], JSON_THROW_ON_ERROR);

        // Correct body, wrong/absent signature.
        $this->call(
            'POST',
            '/api/v1/webhooks/paystack',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_PAYSTACK_SIGNATURE' => 'not-a-valid-signature',
            ],
            $body,
        );

        $this->assertNotSame(
            PaymentStatus::Succeeded,
            $payment->fresh()->status,
            'An unsigned webhook must not settle a payment.',
        );
    }

    /**
     * Paystack has no separate webhook secret. It signs the notification with
     * HMAC SHA512 over the raw body using the SECRET KEY, and sends the result
     * in `x-paystack-signature`. If this regresses to looking for a
     * `PAYSTACK_WEBHOOK_SECRET`, every real notification is rejected as
     * unsigned and payments silently never settle.
     */
    public function test_a_signature_hmac_sha512_of_the_raw_body_signed_with_the_secret_key_settles_the_payment(): void
    {
        config(['payments.gateways.paystack.secret_key' => 'sk_test_hmac_source']);

        $employer = $this->employer();
        $plan = $this->plan('business');

        $payment = Payment::create([
            'user_id' => $employer->id,
            'company_id' => $this->companyOf($employer)->id,
            'plan_id' => $plan->id,
            'gateway' => 'paystack',
            'status' => PaymentStatus::Pending,
            'amount' => $plan->price,
            'currency' => $plan->currency,
            'billing_period' => $plan->billing_period,
            'reference' => 'hh_hmac_probe',
        ]);

        $body = json_encode([
            'event' => 'charge.success',
            'data' => [
                'reference' => $payment->reference,
                'amount' => $plan->price,
                'currency' => 'NGN',
                'status' => 'success',
            ],
        ], JSON_THROW_ON_ERROR);

        $this->postWebhook($body, hash_hmac('sha512', $body, 'sk_test_hmac_source'))
            ->assertOk();

        $this->assertSame(
            PaymentStatus::Succeeded,
            $payment->fresh()->status,
            'A correctly signed webhook must settle the payment.'
        );
    }

    /**
     * The hash covers the exact bytes Paystack sent.
     *
     * This is the failure that a happy-path test cannot see. Decoding to a PHP
     * array and re-encoding it produces equivalent JSON that hashes
     * differently, so signing the re-encoding instead of the body would pass
     * every correctly-shaped test and reject 100% of real traffic.
     */
    public function test_the_signature_must_cover_the_raw_bytes_not_a_re_encoded_array(): void
    {
        config(['payments.gateways.paystack.secret_key' => 'sk_test_raw_bytes']);

        $employer = $this->employer();
        $plan = $this->plan('business');

        $payment = Payment::create([
            'user_id' => $employer->id,
            'company_id' => $this->companyOf($employer)->id,
            'plan_id' => $plan->id,
            'gateway' => 'paystack',
            'status' => PaymentStatus::Pending,
            'amount' => $plan->price,
            'currency' => $plan->currency,
            'billing_period' => $plan->billing_period,
            'reference' => 'hh_raw_bytes_probe',
        ]);

        // Pretty-printed, so the bytes on the wire differ from any re-encoding.
        $body = json_encode([
            'event' => 'charge.success',
            'data' => [
                'reference' => $payment->reference,
                'amount' => $plan->price,
                'currency' => 'NGN',
                'status' => 'success',
            ],
        ], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);

        $reEncoded = json_encode(json_decode($body, true, 512, JSON_THROW_ON_ERROR), JSON_THROW_ON_ERROR);

        $this->assertNotSame(
            $body,
            $reEncoded,
            'Guard assumption: this test only means something if the two byte '
            .'strings genuinely differ.'
        );

        // Signature over the compact re-encoding, not over what was sent.
        $this->postWebhook($body, hash_hmac('sha512', $reEncoded, 'sk_test_raw_bytes'))
            ->assertStatus(401);

        $this->assertNotSame(
            PaymentStatus::Succeeded,
            $payment->fresh()->status,
            'A signature over re-encoded JSON must not settle a payment.'
        );
    }

    /**
     * Posts to the webhook endpoint with an exact raw body, bypassing the
     * test client's form encoding so the bytes hashed are the bytes sent.
     */
    private function postWebhook(string $rawBody, string $signature): TestResponse
    {
        return $this->call(
            'POST',
            '/api/v1/webhooks/paystack',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_PAYSTACK_SIGNATURE' => $signature,
            ],
            $rawBody,
        );
    }
}
