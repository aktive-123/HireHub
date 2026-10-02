<?php

namespace Tests\Feature;

use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\HiringFee;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\Subscription;
use App\Models\User;
use App\Services\ReceiptService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\ApiTestCase;

/**
 * Receipts, end to end.
 *
 * Two properties are worth more than the rest.
 *
 * First, a receipt is scoped. A receipt carries a payer's name, email and
 * gateway transaction id, so reading someone else's is a data breach, not a
 * cosmetic bug. The cross-company tests are the point of this file.
 *
 * Second, a receipt must never be able to break a payment. The money has
 * already moved by the time a receipt is written, so a failure there is a
 * support ticket and never a reason to withhold a plan the customer paid for.
 * That is asserted directly, by breaking the receipt layer on purpose.
 */
class ReceiptTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['payments.gateways.paystack.secret_key' => 'sk_test_receipt', 'mail.enabled' => false]);

        // Faked for the whole file rather than per-test, so no test here can
        // reach Paystack's live API by forgetting to stub. That failure is not
        // hypothetical: an unstubbed checkout call returns Paystack's own 401,
        // which surfaces as a confusing "expected 201, got 401" rather than as
        // the missing stub it actually is.
        Http::fake([
            'api.paystack.co/transaction/initialize' => fn () => Http::response([
                'status' => true,
                'data' => [
                    'authorization_url' => 'https://checkout.paystack.com/hh_receipt_test',
                    'access_code' => 'acc_'.Str::lower(Str::random(16)),
                    'reference' => 'hh_receipt_pending',
                ],
            ]),
        ]);
    }

    // --- issuing -----------------------------------------------------------

    public function test_a_settled_payment_gets_a_numbered_snapshotted_receipt(): void
    {
        [$payment] = $this->subscribe($this->employer(), 'business');

        $receipt = app(ReceiptService::class)->issue($payment->fresh());

        $this->assertSame($payment->id, $receipt->payment_id);
        $this->assertMatchesRegularExpression('/^HH-\d{4}-\d{6}$/', $receipt->number);
        $this->assertSame($payment->user->email, $receipt->payer_email);
        $this->assertSame($payment->amount, $receipt->amount);
        $this->assertSame($payment->currency, $receipt->currency);
        $this->assertSame($payment->gateway_reference, $receipt->gateway_reference);
        $this->assertNotNull($receipt->paid_at);
    }

    /**
     * A receipt reading "plan_id 3" is technically accurate and practically
     * useless.
     */
    public function test_the_description_names_what_was_bought(): void
    {
        [$payment] = $this->subscribe($this->employer(), 'business');
        $receipt = app(ReceiptService::class)->issue($payment->fresh());

        $this->assertStringContainsString('Business', $receipt->item_description);
        $this->assertStringContainsString('monthly', $receipt->item_description);
    }

    /**
     * A duplicate webhook must not mint a second document. Two receipts for
     * one charge is the kind of thing an auditor flags.
     */
    public function test_issuing_twice_returns_the_same_receipt(): void
    {
        [$payment] = $this->subscribe($this->employer(), 'professional');
        $service = app(ReceiptService::class);

        $first = $service->issue($payment->fresh());
        $second = $service->issue($payment->fresh());

        $this->assertTrue($first->is($second));
        $this->assertSame(1, Receipt::query()->where('payment_id', $payment->id)->count());
    }

    /**
     * The snapshot must not follow a later edit: a customer who downloaded a
     * receipt last year is owed a document describing what they were charged
     * for then.
     */
    public function test_the_receipt_keeps_its_own_copy_of_the_item(): void
    {
        [$payment] = $this->subscribe($this->employer(), 'business');
        $receipt = app(ReceiptService::class)->issue($payment->fresh());

        $payment->plan->update(['name' => 'Renamed After The Fact']);

        $this->assertStringContainsString('Business', (string) $receipt->fresh()->item_description);
    }

    public function test_an_unpaid_payment_is_not_issued_a_receipt(): void
    {
        $employer = $this->employer();
        $company = $this->companyOf($employer);
        $plan = $this->plan('business');

        $pending = Payment::create([
            'user_id' => $employer->id,
            'company_id' => $company->id,
            'plan_id' => $plan->id,
            'gateway' => 'paystack',
            'status' => PaymentStatus::Pending,
            'amount' => $plan->price,
            'currency' => $plan->currency,
            'billing_period' => $plan->billing_period,
            'reference' => 'hh_pending_receipt_test',
        ]);

        $service = app(ReceiptService::class);

        $this->assertFalse($service->canIssue($pending));
        $this->assertDatabaseMissing('receipts', ['payment_id' => $pending->id]);
    }

    /**
     * The controller refuses to serve an unsettled receipt over HTTP, but
     * `issue()` is also reachable from the webhook and confirmation paths. It
     * has to refuse on its own: a receipt for a payment that never settled is
     * a document that outlives the correction and gets quoted in support.
     */
    public function test_issuing_refuses_a_payment_that_has_not_settled(): void
    {
        $employer = $this->employer();
        $company = $this->companyOf($employer);
        $plan = $this->plan('business');

        $pending = Payment::create([
            'user_id' => $employer->id,
            'company_id' => $company->id,
            'plan_id' => $plan->id,
            'gateway' => 'paystack',
            'status' => PaymentStatus::Pending,
            'amount' => $plan->price,
            'currency' => $plan->currency,
            'billing_period' => $plan->billing_period,
            'reference' => 'hh_issue_refuses_pending',
        ]);

        $this->expectException(RuntimeException::class);

        try {
            app(ReceiptService::class)->issue($pending);
        } finally {
            $this->assertDatabaseMissing('receipts', ['payment_id' => $pending->id]);
        }
    }

    /**
     * A webhook replay and a customer opening the same receipt can arrive at
     * once. Both find no receipt, both insert, and the unique index rejects the
     * second — which must resolve to the winner's document, not a 500 on the
     * one charge the customer just paid for.
     */
    public function test_a_lost_insert_race_resolves_to_the_winning_receipt(): void
    {
        [$payment] = $this->subscribe($this->employer(), 'business');
        $service = app(ReceiptService::class);

        // Reproduces the interleaving that defeats the "has a receipt already?"
        // check: another writer commits *after* this reader has answered no, so
        // the insert below is the one the unique index rejects.
        $loser = new class extends ReceiptService
        {
            public ReceiptService $inner;

            public int $attempts = 0;

            protected function write(Payment $payment): Receipt
            {
                $this->attempts++;

                // A real second insert against the unique index, rather than a
                // hand-thrown exception, so the test depends on the same failure
                // production hits and not on a class name.
                $this->inner->write($payment);

                return $this->inner->write($payment);
            }
        };

        $loser->inner = $service;

        $resolved = $loser->issue($payment->fresh());

        $this->assertSame(1, $loser->attempts);
        $this->assertSame($payment->id, $resolved->payment_id);
        $this->assertSame(1, Receipt::query()->where('payment_id', $payment->id)->count());
    }

    // --- reading over HTTP -------------------------------------------------

    public function test_an_employer_can_view_and_download_their_own_receipt(): void
    {
        $employer = $this->employer();
        [$payment] = $this->subscribe($employer, 'business');
        app(ReceiptService::class)->issue($payment->fresh());

        $this->asApiUser($employer)
            ->get("/api/v1/employer/billing/receipts/{$payment->reference}")
            ->assertOk()
            ->assertSee('Business', false);

        $this->asApiUser($employer)
            ->get("/api/v1/employer/billing/receipts/{$payment->reference}/download")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    /**
     * Magic bytes rather than a status code: an endpoint that returned an HTML
     * error page with a 200 would pass every other assertion in this file.
     */
    public function test_the_downloaded_file_is_a_real_pdf_not_an_html_page(): void
    {
        $employer = $this->employer();
        [$payment] = $this->subscribe($employer, 'business');

        $response = $this->asApiUser($employer)
            ->get("/api/v1/employer/billing/receipts/{$payment->reference}/download");

        $response->assertOk();
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertStringContainsString('attachment;', (string) $response->headers->get('Content-Disposition'));
    }

    public function test_an_employer_cannot_read_another_companys_receipt(): void
    {
        $employer = $this->employer();
        [$payment] = $this->subscribe($employer, 'business');
        app(ReceiptService::class)->issue($payment->fresh());

        $stranger = $this->employer();

        // 404, not 403: a 403 would confirm that the reference exists.
        $this->asApiUser($stranger)
            ->getJson("/api/v1/employer/billing/receipts/{$payment->reference}")
            ->assertNotFound();

        $this->asApiUser($stranger)
            ->get("/api/v1/employer/billing/receipts/{$payment->reference}/download")
            ->assertNotFound();
    }

    public function test_an_admin_can_download_any_receipt_on_the_platform(): void
    {
        [$payment] = $this->subscribe($this->employer(), 'business');

        $this->asApiUser($this->admin())
            ->get("/api/v1/admin/receipts/{$payment->reference}/download")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_a_job_seeker_cannot_reach_the_employer_receipt_endpoint(): void
    {
        [$payment] = $this->subscribe($this->employer(), 'business');
        $seeker = User::factory()->create(['role' => UserRole::Seeker->value]);

        $this->asApiUser($seeker)
            ->getJson("/api/v1/employer/billing/receipts/{$payment->reference}")
            ->assertForbidden();
    }

    public function test_an_unpaid_payment_is_refused_over_http(): void
    {
        $employer = $this->employer();
        $company = $this->companyOf($employer);
        $plan = $this->plan('business');

        $pending = Payment::create([
            'user_id' => $employer->id,
            'company_id' => $company->id,
            'plan_id' => $plan->id,
            'gateway' => 'paystack',
            'status' => PaymentStatus::Pending,
            'amount' => $plan->price,
            'currency' => $plan->currency,
            'billing_period' => $plan->billing_period,
            'reference' => 'hh_pending_http_receipt',
        ]);

        $this->asApiUser($employer)
            ->getJson("/api/v1/employer/billing/receipts/{$pending->reference}")
            ->assertStatus(409);
    }

    /**
     * The guarantee that matters operationally, asserted rather than assumed:
     * break the receipt layer, pay, and confirm the plan still activates.
     */
    public function test_a_broken_receipt_layer_cannot_block_a_paid_subscription(): void
    {
        $employer = $this->employer();
        $plan = $this->plan('business');

        $this->asApiUser($employer)
            ->postJson('/api/v1/employer/billing/checkout', [
                'plan' => $plan->slug,
                'gateway' => 'paystack',
            ])
            ->assertCreated();

        $payment = Payment::where('company_id', $employer->company->id)->latest('id')->firstOrFail();

        // Broken only now, after the money is committed and immediately before
        // the provider confirms it. Installing the mock before checkout would
        // have tested something easier to pass and less like reality.
        $this->mock(ReceiptService::class, function ($mock): void {
            $mock->shouldReceive('issue')->andThrow(new RuntimeException('receipt layer is down'));
        });

        $this->deliverPaystackSuccess($payment->reference, (int) $plan->price, $plan->currency);

        $this->assertSame(PaymentStatus::Succeeded, $payment->fresh()->status);
        $this->assertNotNull(
            Subscription::query()->where('company_id', $employer->company->id)->live()->first(),
            'The plan must activate even though issuing the receipt threw.'
        );
    }

    /**
     * The Placement Fees table only knows a fee reference, so the same document
     * has to be reachable by that identifier too.
     */
    public function test_a_receipt_is_reachable_by_its_hiring_fee_reference(): void
    {
        [$fee, $payment, $employer] = $this->paidHiringFee('hh_fee_receipt_test');

        $this->asApiUser($employer)
            ->get("/api/v1/employer/hiring-fees/{$fee->reference}/receipt/download")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        // And it must read as a hire, not as a subscription.
        $receipt = app(ReceiptService::class)->forPayment($payment->fresh());

        $this->assertStringContainsString('Hiring confirmation fee', $receipt->item_description);
        $this->assertStringContainsString($fee->job->title, $receipt->item_description);
    }

    public function test_another_company_cannot_reach_a_hiring_fee_receipt(): void
    {
        [$fee] = $this->paidHiringFee('hh_fee_receipt_private');

        $this->asApiUser($this->employer())
            ->getJson("/api/v1/employer/hiring-fees/{$fee->reference}/receipt")
            ->assertNotFound();
    }

    /**
     * A fee whose payment is still pending exists, so this is a conflict
     * rather than a missing row — and the message has to say "not paid yet",
     * because "not found" would read like the receipt was deleted.
     */
    public function test_an_unpaid_hiring_fee_has_no_receipt(): void
    {
        [$fee, , $employer] = $this->paidHiringFee('hh_fee_unpaid_receipt', PaymentStatus::Pending);

        $this->asApiUser($employer)
            ->getJson("/api/v1/employer/hiring-fees/{$fee->reference}/receipt")
            ->assertStatus(409)
            ->assertJsonPath('message', fn (string $m): bool => str_contains($m, 'not been paid'));
    }

    /**
     * A hiring fee and the payment that funded it, wired together the way the
     * checkout path wires them.
     *
     * @return array{0: HiringFee, 1: Payment, 2: User}
     */
    private function paidHiringFee(string $reference, PaymentStatus $status = PaymentStatus::Succeeded): array
    {
        $employer = $this->employer();
        $company = $this->companyOf($employer);
        $job = $this->makeJob($company);
        $seeker = User::factory()->create(['role' => UserRole::Seeker->value]);
        $application = $this->makeApplication($job, $seeker);

        $payment = Payment::create([
            'user_id' => $employer->id,
            'company_id' => $company->id,
            'plan_id' => null,
            'purpose' => PaymentPurpose::HiringFee->value,
            'gateway' => 'paystack',
            'status' => $status,
            'amount' => 12_500_000,
            'currency' => 'NGN',
            'billing_period' => 'monthly',
            'reference' => $reference.'_payment',
            'gateway_reference' => 'ps_'.$reference,
            'paid_at' => $status === PaymentStatus::Succeeded ? now() : null,
        ]);

        $fee = HiringFee::create([
            'employer_id' => $employer->id,
            'company_id' => $company->id,
            'job_id' => $job->id,
            'application_id' => $application->id,
            'payment_id' => $payment->id,
            'status' => $status,
            'amount' => 12_500_000,
            'currency' => 'NGN',
            'level' => null,
            'percentage_applied' => null,
            'reference' => $reference,
            'paid_at' => $payment->paid_at,
        ]);

        return [$fee->load(['employer', 'job']), $payment, $employer];
    }

    /**
     * Signed exactly as Paystack would, so the real activation path runs.
     */
    private function deliverPaystackSuccess(string $reference, int $amount, string $currency): void
    {
        $payload = [
            'event' => 'charge.success',
            'data' => [
                'reference' => $reference,
                'amount' => $amount,
                'currency' => $currency,
                'status' => 'success',
                'paid_at' => now()->toIso8601String(),
            ],
        ];

        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        $this->call(
            'POST',
            '/api/v1/webhooks/paystack',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_PAYSTACK_SIGNATURE' => hash_hmac('sha512', $body, (string) config('payments.gateways.paystack.secret_key')),
            ],
            $body,
        );
    }
}
