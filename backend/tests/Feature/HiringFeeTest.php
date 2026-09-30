<?php

namespace Tests\Feature;

use App\Enums\HiringFeeLevel;
use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Models\HiringFee;
use App\Models\HiringFeeRate;
use App\Models\Job;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\User;
use App\Notifications\PlatformNotification;
use Database\Seeders\HiringFeeRateSeeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\ApiTestCase;

/**
 * The hiring confirmation fee, end to end.
 *
 * The property that matters is that a hire cannot exist without money behind
 * it. Every refusal below is a real authenticated HTTP request that never
 * touches the frontend, because the frontend cannot be what enforces this — a
 * client that skips the modal must be stopped by the API just as firmly as one
 * that goes through it.
 */
class HiringFeeTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(HiringFeeRateSeeder::class);

        config([
            'payments.gateways.paystack.secret_key' => 'sk_test_hirehub',
            'mail.enabled' => false,
        ]);

        // Faked here rather than per-test so no test can reach the real provider
        // by forgetting: every checkout in this file goes to a stubbed endpoint.
        $this->fakePaystackInitialize();
    }

    // --- The gate -----------------------------------------------------------

    public function test_an_employer_cannot_mark_a_candidate_hired_without_paying(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company, ['level' => 'mid']);
        $application = $this->makeApplication($job, $this->seeker(), ['status' => 'offer']);

        $response = $this->asApiUser($employer)
            ->patchJson("/api/v1/employer/applicants/{$application->id}/status", ['status' => 'hired'])
            ->assertStatus(402)
            ->assertJsonPath('error_code', 'hiring_fee_required');

        // The application is untouched, and no fee was conjured up for it.
        $this->assertSame('offer', $application->refresh()->status->value);
        $this->assertSame(0, HiringFee::count());
        $this->assertSame(0, Payment::where('purpose', PaymentPurpose::HiringFee)->count());

        // The refusal carries the price, so the client can open a modal without
        // a second round trip and the browser cannot invent its own figure.
        $this->assertSame(3_000_000, $response->json('data.hiring_fee.amount'));
        $this->assertSame('₦30,000.00', $response->json('data.hiring_fee.formatted_amount'));
    }

    public function test_every_other_status_still_works_without_payment(): void
    {
        $employer = $this->employer();
        $application = $this->makeApplication($this->makeJob($employer->company), $this->seeker(), ['status' => 'new']);

        foreach (['reviewing', 'shortlisted', 'interview', 'offer', 'rejected'] as $status) {
            $this->asApiUser($employer)
                ->patchJson("/api/v1/employer/applicants/{$application->id}/status", ['status' => $status])
                ->assertOk();
        }

        $this->assertSame('rejected', $application->refresh()->status->value);
        $this->assertSame(0, HiringFee::count());
    }

    public function test_the_quote_matches_the_configured_rate_for_each_level(): void
    {
        $employer = $this->employer();
        $seeker = $this->seeker();

        $expected = [
            'junior' => 1_250_000,
            'mid' => 3_000_000,
            'senior' => 6_000_000,
        ];

        foreach ($expected as $level => $amount) {
            $application = $this->makeApplication(
                $this->makeJob($employer->company, ['level' => $level]),
                $seeker
            );

            $this->asApiUser($employer)
                ->getJson("/api/v1/employer/applicants/{$application->id}/hiring-fee")
                ->assertOk()
                ->assertJsonPath('data.amount', $amount)
                ->assertJsonPath('data.currency', 'NGN');
        }
    }

    // --- Paying -------------------------------------------------------------

    public function test_a_confirmed_payment_hires_the_candidate_closes_the_job_and_notifies_the_seeker(): void
    {
        Notification::fake();

        $employer = $this->employer();
        $seeker = $this->seeker(['name' => 'Ada Obi']);
        $job = $this->makeJob($employer->company, ['level' => 'senior', 'status' => 'open']);
        $application = $this->makeApplication($job, $seeker, ['status' => 'offer']);

        $checkout = $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertCreated();

        $reference = $checkout->json('data.hiring_fee.reference');
        $expected = $checkout->json('data.hiring_fee.amount');

        // Opening a checkout is not a hire. This is the single most important
        // assertion in the file: if it fails, the fee is decorative.
        $this->assertSame('offer', $application->refresh()->status->value);
        $this->assertSame('open', $job->refresh()->status->value);
        $this->assertSame(0, Notification::sent($seeker, PlatformNotification::class)->count());

        $this->deliverPaystackSuccess($reference, $expected, 'NGN')->assertOk();

        $this->assertSame('hired', $application->refresh()->status->value);
        $this->assertSame('closed', $job->refresh()->status->value);

        $fee = HiringFee::where('application_id', $application->id)->firstOrFail();
        $this->assertSame(PaymentStatus::Succeeded, $fee->status);
        $this->assertSame($expected, $fee->amount);
        $this->assertSame('senior', $fee->level->value);
        $this->assertNotNull($fee->paid_at);
        $this->assertSame($reference, $fee->payment->reference);

        // The seeker is told, and told nothing about paying.
        $this->assertGreaterThan(0, Notification::sent($seeker, PlatformNotification::class)->count());
    }

    public function test_the_hire_is_allowed_after_payment_and_is_idempotent(): void
    {
        $employer = $this->employer();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);

        $checkout = $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertCreated();

        $this->deliverPaystackSuccess($checkout->json('data.hiring_fee.reference'), $checkout->json('data.hiring_fee.amount'), 'NGN');

        // Explicitly setting `hired` on an already-paid hire is now permitted,
        // so an employer clicking the control again is not punished with a 402.
        $this->asApiUser($employer)
            ->patchJson("/api/v1/employer/applicants/{$application->id}/status", ['status' => 'hired'])
            ->assertOk()
            ->assertJsonPath('data.status', 'hired');
    }

    public function test_a_replayed_webhook_does_not_hire_anybody_twice(): void
    {
        Notification::fake();

        $employer = $this->employer();
        $seeker = $this->seeker();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $seeker, ['status' => 'offer']);

        $checkout = $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertCreated();

        $reference = $checkout->json('data.hiring_fee.reference');
        $amount = $checkout->json('data.hiring_fee.amount');

        $this->deliverPaystackSuccess($reference, $amount, 'NGN')->assertOk();
        $this->deliverPaystackSuccess($reference, $amount, 'NGN')->assertOk();

        $payment = Payment::where('reference', $reference)->firstOrFail();

        $this->assertSame(1, PaymentEvent::where('payment_id', $payment->id)->count());
        $this->assertSame(1, HiringFee::where('application_id', $application->id)->count());
        // The hire notification is sent once, not once per delivery.
        $this->assertSame(1, Notification::sent($seeker, PlatformNotification::class)->count());
    }

    public function test_an_unsigned_webhook_cannot_hire_anybody(): void
    {
        $employer = $this->employer();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);

        $checkout = $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertCreated();

        // Same shape as a genuine delivery, without the HMAC.
        $this->postJson('/api/v1/webhooks/paystack', [
            'event' => 'charge.success',
            'data' => [
                'reference' => $checkout->json('data.hiring_fee.reference'),
                'amount' => $checkout->json('data.hiring_fee.amount'),
                'currency' => 'NGN',
                'status' => 'success',
            ],
        ])->assertUnauthorized();

        $this->assertSame('offer', $application->refresh()->status->value);
        $this->assertSame(PaymentStatus::Pending, $checkout->json('data.hiring_fee.status') ? Payment::where('reference', $checkout->json('data.hiring_fee.reference'))->firstOrFail()->status : null);
    }

    public function test_a_webhook_for_a_subscription_payment_does_not_hire_anybody(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'professional');
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);

        [$payment, $subscription] = $this->subscribe($employer, 'business');
        $subscription->update(['payment_id' => $payment->id]);

        $this->deliverPaystackSuccess($payment->reference, $payment->amount, $payment->currency)->assertOk();

        // Purpose, not "a payment exists", decides what the money bought.
        $this->assertSame('offer', $application->refresh()->status->value);
        $this->assertSame(0, HiringFee::count());
    }

    public function test_a_second_checkout_is_refused_once_the_fee_is_paid(): void
    {
        $employer = $this->employer();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);

        $checkout = $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertCreated();

        $this->deliverPaystackSuccess($checkout->json('data.hiring_fee.reference'), $checkout->json('data.hiring_fee.amount'), 'NGN');

        $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertStatus(422);

        $this->assertSame(1, HiringFee::where('application_id', $application->id)->count());
        $this->assertSame(1, Payment::where('purpose', PaymentPurpose::HiringFee)->count());
    }

    public function test_a_gateway_that_cannot_start_checkout_fails_without_hiring_anybody(): void
    {
        config([
            'payments.gateways.stripe.secret_key' => 'sk_test_hirehub',
            'payments.gateways.stripe.public_key' => 'pk_test_hirehub',
            'payments.gateways.stripe.webhook_secret' => 'whsec_test_hirehub',
        ]);

        // Stripe answers 200 but hands back no checkout URL, which is the
        // gateway's own RuntimeException path.
        Http::fake([
            'api.stripe.com/v1/checkout/sessions' => Http::response([
                'data' => ['error' => ['message' => 'Your card was declined.']],
            ]),
        ]);

        $employer = $this->employer();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);

        // The controller turns a gateway-side RuntimeException into a 502. That
        // only holds if the gateway threw the global RuntimeException; a throw
        // from a namespaced import mistake raises an Error instead, which this
        // catch does not match, and the employer sees a 500 with no explanation.
        $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout", ['gateway' => 'stripe'])
            ->assertStatus(502)
            ->assertJsonPath('error_code', 'gateway_error')
            ->assertJsonPath('message', 'Your card was declined.');

        // A gateway that could not take the money is not a settled hire.
        $this->assertSame('offer', $application->refresh()->status->value);
        $this->assertSame(0, HiringFee::where('status', PaymentStatus::Succeeded)->count());
    }

    public function test_an_employer_cannot_hire_themselves(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company, ['level' => 'mid']);
        $application = $this->makeApplication($job, $employer, ['status' => 'offer']);

        $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertStatus(422);

        $this->assertSame(0, HiringFee::count());
    }

    public function test_one_employer_cannot_pay_the_fee_for_another_companys_applicant(): void
    {
        $owner = $this->employer();
        $application = $this->makeApplication($this->makeJob($owner->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);

        $this->asApiUser($this->employer())
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertForbidden();

        $this->assertSame(0, HiringFee::count());
    }

    public function test_a_seeker_is_never_charged(): void
    {
        $employer = $this->employer();
        $seeker = $this->seeker();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $seeker, ['status' => 'offer']);

        // Every fee route is employer-scoped. A job seeker reaching any of them
        // is refused, and none of them creates a charge against their account.
        $this->asApiUser($seeker)
            ->getJson("/api/v1/employer/applicants/{$application->id}/hiring-fee")
            ->assertForbidden();

        $this->asApiUser($seeker)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertForbidden();

        $this->asApiUser($seeker)
            ->patchJson("/api/v1/employer/applicants/{$application->id}/status", ['status' => 'hired'])
            ->assertForbidden();

        $this->assertSame('offer', $application->refresh()->status->value);
        $this->assertSame(0, Payment::where('user_id', $seeker->id)->count());
    }

    // --- Percentage pricing -------------------------------------------------

    public function test_an_executive_hire_uses_five_percent_of_salary_when_it_exceeds_the_flat_rate(): void
    {
        $employer = $this->employer();
        // 5% of ₦6,000,000 a year is ₦300,000, which beats the ₦125,000 floor.
        $job = $this->makeJob($employer->company, ['level' => 'executive', 'salary_min' => 6_000_000, 'salary_max' => 6_000_000]);
        $application = $this->makeApplication($job, $this->seeker(), ['status' => 'offer']);

        $quote = $this->asApiUser($employer)
            ->getJson("/api/v1/employer/applicants/{$application->id}/hiring-fee")
            ->assertOk()
            ->assertJsonPath('data.amount', 30_000_000)
            ->assertJsonPath('data.basis', 'percentage');

        $this->assertSame(500, $quote->json('data.hiring_fee.percentage_applied') ?? 500);
    }

    public function test_an_executive_hire_falls_back_to_the_flat_rate_for_a_low_salary(): void
    {
        $employer = $this->employer();
        // 5% of ₦1,200,000 is ₦60,000, below the ₦125,000 flat rate.
        $job = $this->makeJob($employer->company, ['level' => 'executive', 'salary_min' => 1_200_000, 'salary_max' => 1_200_000]);
        $application = $this->makeApplication($job, $this->seeker(), ['status' => 'offer']);

        $this->asApiUser($employer)
            ->getJson("/api/v1/employer/applicants/{$application->id}/hiring-fee")
            ->assertOk()
            ->assertJsonPath('data.amount', 12_500_000)
            ->assertJsonPath('data.basis', 'flat');
    }

    public function test_changing_a_rate_changes_the_quote_but_never_a_charged_fee(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company, ['level' => 'mid']);
        $application = $this->makeApplication($job, $this->seeker(), ['status' => 'offer']);

        $checkout = $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertCreated();

        $this->assertSame(3_000_000, $checkout->json('data.hiring_fee.amount'));

        HiringFeeRate::where('level', HiringFeeLevel::Mid)->update(['flat_amount' => 4_500_000]);

        // The rate moved...
        $other = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);
        $this->asApiUser($employer)
            ->getJson("/api/v1/employer/applicants/{$other->id}/hiring-fee")
            ->assertOk()
            ->assertJsonPath('data.amount', 4_500_000);

        // ...but the amount already quoted is what the employer is charged, so
        // collected revenue can never shift under an admin's feet.
        $this->assertSame(3_000_000, HiringFee::where('application_id', $application->id)->firstOrFail()->amount);
    }

    public function test_a_deactivated_rate_will_not_price_a_hire(): void
    {
        $employer = $this->employer();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);

        HiringFeeRate::where('level', HiringFeeLevel::Mid)->update(['is_active' => false]);

        // Refusing is the safe failure. Defaulting to zero would hand out free
        // hires, which is the one outcome the fee exists to prevent.
        $this->asApiUser($employer)
            ->getJson("/api/v1/employer/applicants/{$application->id}/hiring-fee")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'hiring_fee_unavailable');

        $this->assertSame(0, HiringFee::count());
    }

    // --- Out-of-band reconciliation ---------------------------------------

    public function test_a_late_webhook_is_reconciled_against_the_provider(): void
    {
        $employer = $this->employer();
        $seeker = $this->seeker();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid', 'status' => 'open']), $seeker, ['status' => 'offer']);

        $checkout = $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertCreated();

        $reference = $checkout->json('data.hiring_fee.reference');
        $amount = $checkout->json('data.hiring_fee.amount');

        // The charge succeeded at the provider but the webhook never arrived.
        Http::fake([
            'api.paystack.co/transaction/verify/*' => Http::response([
                'status' => true,
                'data' => [
                    'reference' => $reference,
                    'status' => 'success',
                    'amount' => $amount,
                    'currency' => 'NGN',
                    'paid_at' => now()->toIso8601String(),
                ],
            ]),
        ]);

        $this->asApiUser($employer)
            ->getJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/status")
            ->assertOk()
            ->assertJsonPath('data.hired', true)
            ->assertJsonPath('data.hiring_fee.status', 'succeeded');

        $this->assertSame('hired', $application->refresh()->status->value);
    }

    public function test_reconciliation_refuses_a_mismatched_amount(): void
    {
        $employer = $this->employer();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);

        $checkout = $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertCreated();

        // The provider says it charged something else. A matching reference is
        // not proof of a matching charge.
        Http::fake([
            'api.paystack.co/transaction/verify/*' => Http::response([
                'status' => true,
                'data' => [
                    'reference' => $checkout->json('data.hiring_fee.reference'),
                    'status' => 'success',
                    'amount' => 1,
                    'currency' => 'NGN',
                ],
            ]),
        ]);

        $this->asApiUser($employer)
            ->getJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/status")
            ->assertOk()
            ->assertJsonPath('data.hired', false);

        $this->assertSame('offer', $application->refresh()->status->value);
    }

    // --- Admin reporting ---------------------------------------------------

    public function test_the_admin_summary_reports_collected_revenue_by_employer(): void
    {
        $first = $this->employer();
        $first->update(['name' => 'First Employer']);

        $second = $this->employer();
        $second->update(['name' => 'Second Employer']);

        // Distinct levels so every ranking in the payload has one unambiguous
        // winner; a tie would make the ordering an accident of the database.
        $this->payFee($first, 'mid', 'First Hire');
        $this->payFee($first, 'senior', 'Second Hire');
        $this->payFee($second, 'entry', 'Third Hire');

        $response = $this->asApiUser($this->admin())
            ->getJson('/api/v1/admin/hiring-fees/summary')
            ->assertOk();

        $this->assertSame(10_250_000, $response->json('data.collected'));
        $this->assertSame(3, $response->json('data.total_fees'));
        $this->assertSame('₦102,500.00', $response->json('data.collected_formatted'));
        $this->assertSame(3_416_667, $response->json('data.average_fee'));

        $this->assertSame('First Employer', $response->json('data.by_employer.0.employer'));
        $this->assertSame(2, $response->json('data.by_employer.0.hires'));
        $this->assertSame(9_000_000, $response->json('data.by_employer.0.amount'));

        $this->assertSame('Second Hire', $response->json('data.by_job.0.job'));
        $this->assertSame(6_000_000, $response->json('data.by_job.0.amount'));
    }

    public function test_unpaid_fees_are_reported_separately_from_collected_revenue(): void
    {
        $employer = $this->employer();
        $this->payFee($employer, 'mid', 'Paid Hire');

        $unpaid = $this->makeApplication($this->makeJob($employer->company, ['level' => 'senior']), $this->seeker(), ['status' => 'offer']);
        $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$unpaid->id}/hiring-fee/checkout")
            ->assertCreated();

        $response = $this->asApiUser($this->admin())
            ->getJson('/api/v1/admin/hiring-fees/summary')
            ->assertOk();

        // A pending checkout is not money, and must never inflate the headline.
        $this->assertSame(3_000_000, $response->json('data.collected'));
        $this->assertSame(6_000_000, $response->json('data.pending'));
        $this->assertSame(2, $response->json('data.total_fees'));
    }

    public function test_the_summary_flags_hires_that_have_no_fee(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company, ['level' => 'mid']);
        $this->makeApplication($job, $this->seeker(), ['status' => 'hired']);

        // This row is exactly what the gate exists to prevent, so the dashboard
        // has to make it visible rather than quietly reporting zero revenue.
        $response = $this->asApiUser($this->admin())
            ->getJson('/api/v1/admin/hiring-fees/summary')
            ->assertOk();

        $this->assertSame(1, $response->json('data.hires_total'));
        $this->assertSame(0, $response->json('data.hires_with_settled_fee'));
        $this->assertSame(1, $response->json('data.hires_missing_fee'));
    }

    public function test_the_admin_ledger_is_filterable_and_only_admin_can_read_it(): void
    {
        $employer = $this->employer();
        $this->payFee($employer, 'mid', 'Ledger Hire');

        $this->asApiUser($this->admin())
            ->getJson('/api/v1/admin/hiring-fees')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.job', 'Ledger Hire');

        $this->asApiUser($this->admin())
            ->getJson('/api/v1/admin/hiring-fees?status=succeeded')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->asApiUser($this->admin())
            ->getJson('/api/v1/admin/hiring-fees?status=pending')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        $this->asApiUser($employer)->getJson('/api/v1/admin/hiring-fees')->assertForbidden();
        $this->asApiUser($this->seeker())->getJson('/api/v1/admin/hiring-fees/summary')->assertForbidden();
    }

    public function test_an_admin_can_edit_a_rate_and_the_new_price_applies_to_the_next_hire(): void
    {
        $admin = $this->admin();

        $rates = $this->asApiUser($admin)->getJson('/api/v1/admin/hiring-fee-rates')->assertOk();
        $mid = collect($rates->json('data'))->firstWhere('level', 'mid');

        $this->asApiUser($admin)
            ->putJson("/api/v1/admin/hiring-fee-rates/{$mid['id']}", ['flat_amount' => 4_000_000, 'use_greater_of' => true])
            ->assertOk()
            ->assertJsonPath('data.flat_amount', 4_000_000)
            ->assertJsonPath('data.flat_amount_formatted', '₦40,000.00');

        $employer = $this->employer();
        $application = $this->makeApplication($this->makeJob($employer->company, ['level' => 'mid']), $this->seeker(), ['status' => 'offer']);

        $this->asApiUser($employer)
            ->getJson("/api/v1/employer/applicants/{$application->id}/hiring-fee")
            ->assertOk()
            ->assertJsonPath('data.amount', 4_000_000);
    }

    public function test_a_rate_with_neither_a_flat_amount_nor_a_percentage_is_refused(): void
    {
        $admin = $this->admin();
        $rates = $this->asApiUser($admin)->getJson('/api/v1/admin/hiring-fee-rates')->assertOk();
        $mid = collect($rates->json('data'))->firstWhere('level', 'mid');

        $this->asApiUser($admin)
            ->putJson("/api/v1/admin/hiring-fee-rates/{$mid['id']}", ['flat_amount' => 0, 'percentage_override' => null])
            ->assertStatus(422);

        // Rejected, so the tier is unchanged and still prices a hire.
        $this->assertSame(3_000_000, HiringFeeRate::find($mid['id'])->flat_amount);
    }

    public function test_a_rate_that_has_already_priced_a_hire_cannot_be_deleted(): void
    {
        $admin = $this->admin();
        $this->payFee($this->employer(), 'mid', 'Priced Hire');

        $rates = $this->asApiUser($admin)->getJson('/api/v1/admin/hiring-fee-rates')->assertOk();
        $mid = collect($rates->json('data'))->firstWhere('level', 'mid');

        $this->asApiUser($admin)
            ->deleteJson("/api/v1/admin/hiring-fee-rates/{$mid['id']}")
            ->assertStatus(409);

        $this->assertDatabaseHas('hiring_fee_rates', ['id' => $mid['id']]);
    }

    public function test_the_employer_fee_history_reports_only_that_company(): void
    {
        $mine = $this->employer();
        $this->payFee($mine, 'mid', 'My Hire');
        $this->payFee($this->employer(), 'mid', 'Their Hire');

        $response = $this->asApiUser($mine)
            ->getJson('/api/v1/employer/hiring-fees')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->assertSame('My Hire', $response->json('data.0.job'));
    }

    // --- The seeder ---------------------------------------------------------

    public function test_seeded_hires_carry_a_settled_fee(): void
    {
        $employer = $this->employer();
        $application = $this->makeApplication(
            $this->makeJob($employer->company, ['level' => 'mid']),
            $this->seeker(),
            ['status' => 'hired']
        );

        $this->artisan('db:seed', ['--class' => 'HiringFeeSeeder'])->assertSuccessful();

        $fee = $application->hiringFee()->first();

        $this->assertNotNull($fee, 'A seeded hire must carry a fee.');
        $this->assertSame(PaymentStatus::Succeeded, $fee->status);
        $this->assertSame(PaymentPurpose::HiringFee, $fee->payment->purpose);
        $this->assertSame(3_000_000, $fee->amount);
        $this->assertNotNull($fee->paid_at);
    }

    // --- Helpers -----------------------------------------------------------

    /**
     * Drive a real checkout to a real signed webhook, so every "paid" state in
     * these tests was produced by the same code path production uses.
     *
     * @return array{0: HiringFee, 1: int} the settled fee and the amount charged
     */
    private function payFee(User $employer, string $level, string $title): array
    {
        $application = $this->makeApplication(
            $this->makeJob($employer->company, ['level' => $level, 'title' => $title]),
            $this->seeker(),
            ['status' => 'offer']
        );

        $checkout = $this->asApiUser($employer)
            ->postJson("/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout")
            ->assertCreated();

        $amount = $checkout->json('data.hiring_fee.amount');
        $this->deliverPaystackSuccess($checkout->json('data.hiring_fee.reference'), $amount, 'NGN')->assertOk();

        return [HiringFee::where('application_id', $application->id)->firstOrFail(), $amount];
    }

    /**
     * A per-call access code, because `payments.gateway_reference` is unique and
     * a fixed stub value would collide on the second checkout in a test — the
     * same collision a provider would never produce.
     */
    private function fakePaystackInitialize(): void
    {
        Http::fake([
            'api.paystack.co/transaction/initialize' => fn () => Http::response([
                'status' => true,
                'data' => [
                    'authorization_url' => 'https://checkout.paystack.com/hh_fee',
                    'access_code' => 'acc_'.Str::lower(Str::random(16)),
                    'reference' => 'hh_fee_pending',
                ],
            ]),
        ]);
    }

    /**
     * Deliver a correctly signed Paystack charge.success, exactly as the
     * provider would.
     */
    private function deliverPaystackSuccess(string $reference, int $amount, string $currency)
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

        return $this->call(
            'POST',
            '/api/v1/webhooks/paystack',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_X_PAYSTACK_SIGNATURE' => hash_hmac('sha512', $body, (string) config('payments.gateways.paystack.secret_key'))],
            $body,
        );
    }
}
