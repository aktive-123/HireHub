<?php

namespace Tests;

use App\Enums\AccountStatus;
use App\Enums\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Profile;
use App\Models\Subscription;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The plan catalogue is reference data every employer request reads, so
        // it is present in every test exactly as it is in production. Without
        // it the free-tier fallback cannot resolve and entitlement checks would
        // fail for a reason that has nothing to do with the code under test.
        $this->seed(PlanSeeder::class);
    }

    public function seeker(array $overrides = []): User
    {
        $user = User::factory()->create(['role' => UserRole::Seeker->value, ...$overrides]);
        $user->profile()->save(Profile::factory()->make());

        return $user->load('profile');
    }

    public function employer(array $companyOverrides = []): User
    {
        $user = User::factory()->create(['role' => UserRole::Employer->value]);
        $user->company()->save(Company::factory()->make($companyOverrides));

        return $user->load('company');
    }

    /**
     * The company belonging to an employer built by `employer()`.
     *
     * `User::$company` is nullable because a job seeker genuinely has no
     * company, so reading it straight off the relation is a nullable type at
     * every call site — which is why dozens of tests used to reach for a
     * suppression to make `makeJob()` accept it. Narrowing once, here, with a
     * real runtime check keeps the honest model and gives callers a `Company`.
     */
    public function companyOf(User $employer): Company
    {
        $company = $employer->company()->first();

        if (! $company instanceof Company) {
            throw new \RuntimeException(
                'employer() always creates a company, so this one is missing. A test is constructing a User by hand instead of via the helper.'
            );
        }

        return $company;
    }

    public function admin(): User
    {
        return User::factory()->create(['role' => UserRole::Admin->value, 'status' => AccountStatus::Active->value]);
    }

    public function asApiUser(User $user): static
    {
        $token = $user->createToken('test', [$user->role->value])->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token);

        // The application instance is reused across requests within a single
        // test, so the auth guard keeps the previously resolved user. Without
        // this, a second asApiUser() call silently keeps the first identity and
        // every authorization assertion after it is testing the wrong actor.
        Auth::forgetGuards();

        return $this;
    }

    public function makeJob(Company $company, array $overrides = []): Job
    {
        return Job::factory()->create([
            'company_id' => $company->id,
            'category_id' => Category::factory()->create()->id,
            'user_id' => $company->user_id,
            ...$overrides,
        ]);
    }

    public function makeApplication(Job $job, User $seeker, array $overrides = []): Application
    {
        return Application::factory()->create([
            'job_id' => $job->id,
            'seeker_id' => $seeker->id,
            ...$overrides,
        ]);
    }

    public function plan(string $slug): Plan
    {
        return Plan::where('slug', $slug)->firstOrFail();
    }

    /**
     * Put an employer on a plan the way a confirmed payment would: a succeeded
     * Payment row and the live Subscription it granted. Both exist so tests can
     * assert against the same records the webhook path writes, rather than
     * against a subscription fabricated in isolation.
     *
     * @return array{0: Payment, 1: Subscription}
     */
    public function subscribe(User $employer, string $planSlug, array $attributes = []): array
    {
        $plan = $this->plan($planSlug);
        $now = now();

        $payment = Payment::create([
            'user_id' => $employer->id,
            'company_id' => $employer->company->id,
            'plan_id' => $plan->id,
            'gateway' => PaymentGateway::Paystack->value,
            'status' => PaymentStatus::Succeeded,
            'amount' => $plan->price,
            'currency' => $plan->currency,
            'billing_period' => $plan->billing_period,
            'reference' => 'hh_test_'.Str::lower(Str::random(12)),
            'gateway_reference' => 'ps_test_'.Str::lower(Str::random(12)),
            'paid_at' => $now,
            ...$attributes,
        ]);

        // A company may hold only one live subscription, enforced by the
        // generated `active_company_id` unique column. Close the previous one
        // the same way a confirmed payment does, so calling this twice reads as
        // a plan change rather than a constraint violation.
        Subscription::query()
            ->where('company_id', $employer->company->id)
            ->live()
            ->update(['superseded_at' => $now, 'status' => SubscriptionStatus::Expired]);

        $subscription = Subscription::create([
            'user_id' => $employer->id,
            'company_id' => $employer->company->id,
            'plan_id' => $plan->id,
            'payment_id' => $payment->id,
            'status' => SubscriptionStatus::Active,
            'gateway' => PaymentGateway::Paystack->value,
            'starts_at' => $now,
            'current_period_end' => $now->copy()->addMonth(),
            ...$attributes,
        ]);

        return [$payment, $subscription];
    }
}
