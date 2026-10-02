<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Mail\PlatformMail;
use App\Models\Application;
use App\Models\Job;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\Subscription;
use App\Notifications\PlatformNotification;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\ApiTestCase;

/**
 * The freemium model, verified end to end against the database.
 *
 * The important property these cover is that no limit is enforced by the
 * browser. Every rejection below is produced by an authenticated HTTP request
 * that never touches the frontend, which is the only way to know the API is
 * actually the thing refusing.
 */
class SubscriptionTest extends ApiTestCase
{
    private function jobPayload(array $overrides = []): array
    {
        return [
            'title' => 'Backend Engineer',
            'workplace' => 'remote',
            'employment_type' => 'full-time',
            'description' => 'Build and maintain the API.',
            'status' => 'open',
            ...$overrides,
        ];
    }

    // --- Job post limit ----------------------------------------------------

    public function test_free_plan_employer_is_blocked_from_a_third_job_post(): void
    {
        $employer = $this->employer();
        $limit = $this->plan('free')->job_post_limit;

        $this->assertSame(2, $limit, 'The free plan allows two posts, so the third is the blocked one.');

        for ($i = 1; $i <= $limit; $i++) {
            $this->asApiUser($employer)
                ->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => "Role {$i}"]))
                ->assertCreated();
        }

        $this->assertSame($limit, Job::where('company_id', $employer->company->id)->count());

        // The blocked request: a real authenticated API call carrying a payload
        // a Free-plan employer is entitled to send. Only the limit stops it.
        $response = $this->asApiUser($employer)
            ->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => 'Third Role']))
            ->assertForbidden()
            ->assertJsonPath('error_code', 'plan_limit_reached');

        // Nothing was written, and the rejection quotes the real allowance.
        $this->assertSame($limit, Job::where('company_id', $employer->company->id)->count());
        $this->assertDatabaseMissing('jobs', ['title' => 'Third Role']);
        $this->assertSame($limit, $response->json('data.usage.usage.job_posts.limit'));
        $this->assertSame(0, $response->json('data.usage.usage.job_posts.remaining'));
        $this->assertSame('free', $response->json('data.usage.plan.slug'));
    }

    public function test_deleting_a_job_frees_a_post_slot(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'free');

        // Jobs are route-bound by slug, which is what the API hands back.
        $first = $this->asApiUser($employer)->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => 'Keeper']))->json('data.job.slug');
        $this->asApiUser($employer)->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => 'Filler']))->assertCreated();

        $this->asApiUser($employer)->deleteJson('/api/v1/employer/jobs/'.$first)->assertOk();

        $this->asApiUser($employer)
            ->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => 'Replacement']))
            ->assertCreated();

        $this->assertDatabaseHas('jobs', ['title' => 'Replacement']);
    }

    public function test_a_paid_plan_lifts_the_post_limit(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'professional');

        for ($i = 1; $i <= 3; $i++) {
            $this->asApiUser($employer)
                ->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => "Paid Role {$i}"]))
                ->assertCreated();
        }

        $this->assertSame(3, Job::where('company_id', $employer->company->id)->count());
    }

    // --- Featured credits --------------------------------------------------

    public function test_the_free_plan_cannot_feature_any_job(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);

        $this->asApiUser($employer)
            ->patchJson("/api/v1/employer/jobs/{$job->slug}/featured", ['featured' => true])
            ->assertForbidden()
            ->assertJsonPath('error_code', 'plan_limit_reached');

        $this->assertFalse($job->fresh()->is_featured);
    }

    public function test_featured_credits_are_capped_by_the_plan(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'professional');
        $slots = $this->plan('professional')->featured_job_limit;

        for ($i = 1; $i <= $slots; $i++) {
            $job = $this->makeJob($employer->company, ['title' => "Featured {$i}"]);
            $this->asApiUser($employer)
                ->patchJson("/api/v1/employer/jobs/{$job->slug}/featured", ['featured' => true])
                ->assertOk();
        }

        $overflow = $this->makeJob($employer->company, ['title' => 'One Too Many']);

        $this->asApiUser($employer)
            ->patchJson("/api/v1/employer/jobs/{$overflow->slug}/featured", ['featured' => true])
            ->assertForbidden()
            ->assertJsonPath('error_code', 'plan_limit_reached');

        $this->assertFalse($overflow->fresh()->is_featured);
        $this->assertSame($slots, $overflow->fresh()->company->jobs()->where('is_featured', true)->count());
    }

    public function test_unfeaturing_a_job_releases_the_credit(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'professional');

        $a = $this->makeJob($employer->company, ['title' => 'Alpha']);
        $b = $this->makeJob($employer->company, ['title' => 'Beta']);

        $this->asApiUser($employer)->patchJson("/api/v1/employer/jobs/{$a->slug}/featured", ['featured' => true])->assertOk();
        $this->asApiUser($employer)->patchJson("/api/v1/employer/jobs/{$b->slug}/featured", ['featured' => true])->assertOk();

        // Both slots spent, so a third is refused...
        $c = $this->makeJob($employer->company, ['title' => 'Gamma']);
        $this->asApiUser($employer)->patchJson("/api/v1/employer/jobs/{$c->slug}/featured", ['featured' => true])->assertForbidden();

        // ...until one is released, which must also be reflected in the
        // response the client uses to redraw the counter.
        $response = $this->asApiUser($employer)
            ->patchJson("/api/v1/employer/jobs/{$a->slug}/featured", ['featured' => false])
            ->assertOk()
            ->assertJsonPath('data.plan.usage.featured.remaining', 1);

        $this->assertFalse($a->fresh()->is_featured);
        $this->asApiUser($employer)->patchJson("/api/v1/employer/jobs/{$c->slug}/featured", ['featured' => true])->assertOk();
    }

    public function test_featuring_the_same_job_twice_does_not_burn_a_credit(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'professional');
        $job = $this->makeJob($employer->company);

        $this->asApiUser($employer)->patchJson("/api/v1/employer/jobs/{$job->slug}/featured", ['featured' => true])->assertOk();
        $this->asApiUser($employer)
            ->patchJson("/api/v1/employer/jobs/{$job->slug}/featured", ['featured' => true])
            ->assertOk()
            ->assertJsonPath('data.plan.usage.featured.used', 1);
    }

    // --- Plan-gated routes -------------------------------------------------

    public function test_analytics_is_refused_for_plans_that_do_not_grant_it(): void
    {
        $employer = $this->employer();

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/analytics')
            ->assertForbidden()
            ->assertJsonPath('error_code', 'plan_upgrade_required')
            ->assertJsonPath('data.feature', 'analytics');

        $this->subscribe($employer, 'professional');
        $this->asApiUser($employer)->getJson('/api/v1/employer/analytics')->assertForbidden();

        $this->subscribe($employer, 'business');
        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/analytics')
            ->assertOk()
            ->assertJsonPath('data.totals.jobs', 0);
    }

    public function test_analytics_reports_only_the_companys_own_data(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'business');

        $mine = $this->makeJob($employer->company, ['title' => 'Mine']);
        $this->makeApplication($mine, $this->seeker(), ['status' => 'hired']);

        $other = $this->makeJob($this->employer()->company, ['title' => 'Theirs']);
        $this->makeApplication($other, $this->seeker(), ['status' => 'hired']);

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/analytics')
            ->assertOk()
            ->assertJsonPath('data.totals.jobs', 1)
            ->assertJsonPath('data.totals.hired', 1)
            ->assertJsonPath('data.top_jobs.0.title', 'Mine');
    }

    /**
     * Seed a hire that took `days` to close.
     *
     * The Application model stamps `status_changed_at` with `now()` on every
     * status transition, which is right for a live pipeline but makes it
     * impossible to express history through the factory. These rows are written
     * with the query builder afterwards so they land without model events —
     * the timestamps are what is under test, not the transition.
     */
    private function makeHireAfterDays(Job $job, int $days): Application
    {
        $application = $this->makeApplication($job, $this->seeker(), ['status' => 'hired']);
        $appliedAt = now()->subDays($days + 2);

        Application::whereKey($application->id)->update([
            'applied_at' => $appliedAt,
            'status_changed_at' => $appliedAt->copy()->addDays($days),
        ]);

        return $application->fresh();
    }

    /**
     * The median must ignore a single extreme outlier.
     *
     * Four hires at 10, 20, 30 and 400 days give a true median of 25. The
     * previous implementation indexed the last sorted element, which reported
     * 400 — the slowest single hire, presented as the typical one.
     */
    public function test_analytics_reports_a_median_days_to_hire_not_the_slowest(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'business');

        $job = $this->makeJob($employer->company, ['title' => 'Hiring slowly']);
        foreach ([10, 20, 30, 400] as $days) {
            $this->makeHireAfterDays($job, $days);
        }

        $median = $this->asApiUser($employer)->getJson('/api/v1/employer/analytics')->json('data.totals.median_days_to_hire');

        // Even sample size: the mean of the two middle values, 20 and 30.
        $this->assertSame(25, $median);
    }

    /** An odd-sized sample is the single middle value, not the maximum. */
    public function test_the_median_of_an_odd_sample_is_the_middle_value(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'business');

        $job = $this->makeJob($employer->company, ['title' => 'Odd sample']);
        foreach ([5, 7, 99] as $days) {
            $this->makeHireAfterDays($job, $days);
        }

        $this->assertSame(
            7,
            $this->asApiUser($employer)->getJson('/api/v1/employer/analytics')->json('data.totals.median_days_to_hire')
        );
    }

    // --- Usage reporting ---------------------------------------------------

    public function test_usage_reports_the_database_not_a_stored_figure(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'professional');

        $this->asApiUser($employer)->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => 'Counted']))->assertCreated();
        $featured = $this->makeJob($employer->company, ['title' => 'Boosted']);
        $this->asApiUser($employer)->patchJson("/api/v1/employer/jobs/{$featured->slug}/featured", ['featured' => true])->assertOk();

        $response = $this->asApiUser($employer)->getJson('/api/v1/employer/billing/usage')->assertOk();

        $this->assertSame(
            Job::where('company_id', $employer->company->id)->count(),
            $response->json('data.usage.job_posts.used')
        );
        $this->assertSame(
            Job::where('company_id', $employer->company->id)->where('is_featured', true)->count(),
            $response->json('data.usage.featured.used')
        );
        $this->assertSame('professional', $response->json('data.plan.slug'));
        $this->assertSame(8, $response->json('data.usage.job_posts.remaining'));
    }

    public function test_the_dashboard_carries_the_same_usage_block(): void
    {
        $employer = $this->employer();
        $this->asApiUser($employer)->postJson('/api/v1/employer/jobs', $this->jobPayload())->assertCreated();

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/dashboard')
            ->assertOk()
            ->assertJsonPath('data.plan.plan.slug', 'free')
            ->assertJsonPath('data.plan.usage.job_posts.used', 1)
            ->assertJsonPath('data.plan.usage.job_posts.remaining', 1);
    }

    public function test_usage_requires_an_employer_account(): void
    {
        $this->asApiUser($this->seeker())
            ->getJson('/api/v1/employer/billing/usage')
            ->assertForbidden();

        $this->asApiUser($this->seeker())
            ->getJson('/api/v1/employer/analytics')
            ->assertForbidden();

        $this->asApiUser($this->admin())
            ->getJson('/api/v1/employer/analytics')
            ->assertForbidden();
    }

    // --- Payment activates the plan ---------------------------------------

    public function test_a_confirmed_payment_activates_the_subscription_in_the_database(): void
    {
        config([
            'payments.gateways.paystack.secret_key' => 'sk_test_hirehub',
            'mail.enabled' => false,
        ]);

        Http::fake([
            'api.paystack.co/transaction/initialize' => Http::response([
                'status' => true,
                'data' => [
                    'authorization_url' => 'https://checkout.paystack.com/hh_test',
                    'access_code' => 'acc_hirehub',
                    'reference' => 'hh_pending',
                ],
            ]),
        ]);

        $employer = $this->employer();
        $plan = $this->plan('professional');

        $checkout = $this->asApiUser($employer)
            ->postJson('/api/v1/employer/billing/checkout', ['plan' => 'professional'])
            ->assertCreated();

        $reference = $checkout->json('data.payment.reference');

        // Checkout alone must not entitle anybody.
        $this->assertDatabaseHas('payments', ['reference' => $reference, 'status' => 'pending']);
        $this->assertSame(0, Subscription::where('company_id', $employer->company->id)->count());
        $this->asApiUser($employer)->getJson('/api/v1/employer/billing/usage')->assertJsonPath('data.plan.slug', 'free');

        $this->deliverPaystackSuccess($reference, $plan->price, $plan->currency)
            ->assertOk()
            ->assertJsonPath('data.applied', true);

        $this->assertDatabaseHas('payments', [
            'reference' => $reference,
            'status' => PaymentStatus::Succeeded->value,
        ]);

        $subscription = Subscription::where('company_id', $employer->company->id)->live()->firstOrFail();
        $this->assertSame($plan->id, $subscription->plan_id);
        $this->assertSame(SubscriptionStatus::Active, $subscription->status);
        $this->assertTrue($subscription->current_period_end->isFuture());
        $this->assertSame($reference, $subscription->payment->reference);

        // The new allowance is live on the very next request: post beyond the
        // free limit of two with no further ceremony.
        for ($i = 1; $i <= 3; $i++) {
            $this->asApiUser($employer)->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => "After Upgrade {$i}"]))->assertCreated();
        }

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/billing/usage')
            ->assertJsonPath('data.plan.slug', 'professional')
            ->assertJsonPath('data.plan.price', $plan->price)
            ->assertJsonPath('data.usage.job_posts.limit', $plan->job_post_limit);
    }

    public function test_an_unsigned_webhook_does_not_activate_anything(): void
    {
        config(['payments.gateways.paystack.secret_key' => 'sk_test_hirehub']);

        $employer = $this->employer();
        [, $subscription] = $this->subscribe($employer, 'professional');

        $this->postJson('/api/v1/webhooks/paystack', [
            'event' => 'charge.success',
            'data' => ['reference' => $subscription->payment->reference, 'amount' => $this->plan('professional')->price, 'currency' => 'NGN', 'status' => 'success'],
        ])->assertUnauthorized();

        $this->assertSame(0, Payment::where('status', PaymentStatus::Succeeded)->count() - 1);
        $this->assertNull(Subscription::where('company_id', $employer->company->id)->live()->first()?->cancelled_at);
    }

    public function test_a_replayed_webhook_does_not_extend_the_period_twice(): void
    {
        config([
            'payments.gateways.paystack.secret_key' => 'sk_test_hirehub',
            'mail.enabled' => false,
        ]);
        Notification::fake();

        Http::fake([
            'api.paystack.co/transaction/initialize' => Http::response([
                'status' => true,
                'data' => ['authorization_url' => 'https://checkout.paystack.com/x', 'access_code' => 'acc_x'],
            ]),
        ]);

        $employer = $this->employer();
        $plan = $this->plan('professional');

        $reference = $this->asApiUser($employer)
            ->postJson('/api/v1/employer/billing/checkout', ['plan' => 'professional'])
            ->assertCreated()
            ->json('data.payment.reference');

        $this->deliverPaystackSuccess($reference, $plan->price, $plan->currency)->assertOk();

        $periodEnd = Subscription::where('company_id', $employer->company->id)->live()->firstOrFail()->current_period_end;
        $payment = Payment::where('reference', $reference)->firstOrFail();

        // A provider retry: the same reference, the same event type. This is the
        // exact shape of Paystack's own dedupe key, so it must be applied once.
        $this->deliverPaystackSuccess($reference, $plan->price, $plan->currency)->assertOk();

        $this->assertSame(
            $periodEnd->toIso8601String(),
            Subscription::where('company_id', $employer->company->id)->live()->firstOrFail()->current_period_end->toIso8601String(),
            'A replay must not roll the period forward again.'
        );
        $this->assertSame(1, PaymentEvent::where('payment_id', $payment->id)->count());
        $this->assertSame(1, Subscription::where('company_id', $employer->company->id)->live()->count());
        $this->assertSame(1, Notification::sent($employer, PlatformNotification::class)->count());
    }

    public function test_renewal_opens_a_checkout_for_the_current_plan(): void
    {
        config(['payments.gateways.paystack.secret_key' => 'sk_test_hirehub']);

        Http::fake([
            'api.paystack.co/transaction/initialize' => Http::response([
                'status' => true,
                'data' => ['authorization_url' => 'https://checkout.paystack.com/renew', 'access_code' => 'acc_renew'],
            ]),
        ]);

        $employer = $this->employer();
        $this->subscribe($employer, 'professional');

        $this->asApiUser($employer)
            ->postJson('/api/v1/employer/billing/subscription/renew')
            ->assertCreated()
            ->assertJsonPath('data.plan', 'professional');

        Http::assertSent(fn (ClientRequest $r) => str_contains($r->url(), 'transaction/initialize'));

        $free = $this->employer();
        $this->subscribe($free, 'free');
        $this->asApiUser($free)
            ->postJson('/api/v1/employer/billing/subscription/renew')
            ->assertStatus(422);
    }

    // --- Scheduled expiry --------------------------------------------------

    public function test_the_sweep_downgrades_an_expired_subscription_to_free(): void
    {
        Mail::fake();
        Notification::fake();
        config(['mail.enabled' => true]);

        $employer = $this->employer();
        [$payment, $subscription] = $this->subscribe($employer, 'business', [
            'starts_at' => now()->subMonth(),
            'current_period_end' => now()->subMinute(),
        ]);

        $this->artisan('subscriptions:reconcile')->assertSuccessful();

        // The paid row is closed, not deleted: the billing history survives.
        $closed = Subscription::find($subscription->id);
        $this->assertSame(SubscriptionStatus::Expired, $closed->status);
        $this->assertNotNull($closed->superseded_at);
        $this->assertSame($this->plan('business')->id, $closed->downgraded_from_plan_id);

        // And a new live free row exists, so the company is explicitly *on*
        // the free plan rather than on nothing at all.
        $live = Subscription::where('company_id', $employer->company->id)->live()->firstOrFail();
        $this->assertSame($this->plan('free')->id, $live->plan_id);
        $this->assertNull($live->current_period_end, 'A free subscription never expires itself.');

        $this->assertSame(
            PaymentStatus::Succeeded->value,
            $payment->fresh()->status->value,
            'The original charge is untouched by the downgrade.'
        );

        Notification::assertSentTo($employer, PlatformNotification::class);
        Mail::assertQueued(PlatformMail::class, fn (PlatformMail $mail) => str_contains($mail->payload['subject'] ?? '', 'ended'));
    }

    public function test_the_downgrade_takes_effect_on_the_allowances(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'business');

        for ($i = 1; $i <= 3; $i++) {
            $this->asApiUser($employer)->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => "Pre Expiry {$i}"]))->assertCreated();
        }

        $this->subscribe($employer, 'free', ['starts_at' => now()->subDays(2), 'current_period_end' => now()->subMinute()]);

        $this->artisan('subscriptions:reconcile')->assertSuccessful();

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/billing/usage')
            ->assertJsonPath('data.plan.slug', 'free')
            ->assertJsonPath('data.usage.job_posts.limit', 2)
            ->assertJsonPath('data.usage.job_posts.used', 2)
            ->assertJsonPath('data.usage.job_posts.remaining', 0);

        // And the free limit is genuinely enforced afterwards.
        $this->asApiUser($employer)
            ->postJson('/api/v1/employer/jobs', $this->jobPayload(['title' => 'Over The Top']))
            ->assertForbidden()
            ->assertJsonPath('error_code', 'plan_limit_reached');
    }

    public function test_free_plan_usage_is_capped_at_the_current_limit(): void
    {
        $employer = $this->employer();

        $this->makeJob($employer->company, ['title' => 'Posted 1']);
        $this->makeJob($employer->company, ['title' => 'Posted 2']);
        $featured = $this->makeJob($employer->company, ['title' => 'Featured', 'is_featured' => true]);
        $this->asApiUser($employer)->patchJson("/api/v1/employer/jobs/{$featured->slug}/featured", ['featured' => true])->assertOk();

        $response = $this->asApiUser($employer)->getJson('/api/v1/employer/billing/usage')->assertOk();

        $this->assertSame('free', $response->json('data.plan.slug'));
        $this->assertSame(2, $response->json('data.usage.job_posts.limit'));
        $this->assertSame(2, $response->json('data.usage.job_posts.used'));
        $this->assertSame(0, $response->json('data.usage.job_posts.remaining'));
        $this->assertSame(0, $response->json('data.usage.featured.limit'));
        $this->assertSame(0, $response->json('data.usage.featured.used'));
        $this->assertSame(0, $response->json('data.usage.featured.remaining'));
    }

    public function test_the_sweep_sends_one_expiry_reminder_per_period(): void
    {
        Mail::fake();
        config(['mail.enabled' => true]);

        $employer = $this->employer();
        [, $subscription] = $this->subscribe($employer, 'professional', [
            'starts_at' => now()->subMonth(),
            'current_period_end' => now()->addDays(2),
        ]);

        $this->artisan('subscriptions:reconcile')->assertSuccessful();
        Mail::assertQueuedCount(1);
        Mail::assertQueued(PlatformMail::class, fn (PlatformMail $mail) => str_contains($mail->payload['subject'] ?? '', 'ends in 2 days'));

        // Idempotent: a second nightly run must not email again.
        $this->artisan('subscriptions:reconcile')->assertSuccessful();
        Mail::assertQueuedCount(1);

        $this->assertNotNull($subscription->fresh()->expiry_reminder_sent_at);
        $this->assertNull($subscription->fresh()->superseded_at, 'A period that has not ended is left alone.');
    }

    public function test_the_sweep_leaves_unexpired_and_free_subscriptions_alone(): void
    {
        Mail::fake();
        config(['mail.enabled' => true]);

        $paid = $this->employer();
        $this->subscribe($paid, 'professional', ['current_period_end' => now()->addDays(20)]);

        $free = $this->employer();
        $this->subscribe($free, 'free');

        $this->artisan('subscriptions:reconcile')->assertSuccessful();

        Mail::assertNothingQueued();
        $this->assertNull(Subscription::where('company_id', $paid->company->id)->live()->firstOrFail()->superseded_at);
        $this->assertSame(1, Subscription::where('company_id', $free->company->id)->count());
    }

    public function test_an_expired_period_stops_granting_paid_limits_before_the_sweep_runs(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'business', [
            'starts_at' => now()->subMonth(),
            'current_period_end' => now()->subMinute(),
        ]);

        // Nothing has rewritten the row yet — the sweep has not run. The gate
        // must still refuse, because a limit cannot depend on a cron tick.
        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/analytics')
            ->assertForbidden()
            ->assertJsonPath('error_code', 'plan_upgrade_required');

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/billing/usage')
            ->assertJsonPath('data.plan.slug', 'free');
    }

    public function test_the_sweep_is_safe_to_run_twice(): void
    {
        Mail::fake();
        config(['mail.enabled' => true]);

        $employer = $this->employer();
        $this->subscribe($employer, 'business', [
            'starts_at' => now()->subMonth(),
            'current_period_end' => now()->subMinute(),
        ]);

        $this->artisan('subscriptions:reconcile')->assertSuccessful();
        $this->artisan('subscriptions:reconcile')->assertSuccessful();

        // One downgrade email, not two, and still exactly one live row — the
        // unique active_company_id column would have thrown otherwise.
        Mail::assertQueuedCount(1);
        $this->assertSame(1, Subscription::where('company_id', $employer->company->id)->live()->count());
    }

    public function test_dry_run_reports_without_writing(): void
    {
        $employer = $this->employer();
        $this->subscribe($employer, 'business', [
            'starts_at' => now()->subMonth(),
            'current_period_end' => now()->subMinute(),
        ]);

        $this->artisan('subscriptions:reconcile --dry-run')->assertSuccessful();

        $this->assertNull(Subscription::where('company_id', $employer->company->id)->live()->firstOrFail()->superseded_at);
    }

    // --- Helpers -----------------------------------------------------------

    /**
     * Deliver a correctly signed Paystack charge.success, exactly as the
     * provider would, so the activation path under test is the real one.
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
