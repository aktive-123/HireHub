<?php

namespace App\Http\Controllers\Api\V1;

use App\Billing\PlanEntitlements;
use App\Enums\PaymentGateway;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\PaymentResource;
use App\Http\Resources\V1\SubscriptionResource;
use App\Models\Company;
use App\Models\Payment;
use App\Models\Plan;
use App\Payments\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use RuntimeException;

class PaymentController extends ApiController
{
    public function __construct(
        protected PaymentService $payments,
        protected PlanEntitlements $entitlements,
    ) {}

    /**
     * The company's plan, its usage counters and its payment state in one call.
     *
     * This is what the dashboard card, the sidebar indicators and the paywall
     * read, so the numbers on screen are the numbers in the database at the
     * moment they were fetched.
     */
    public function usage(Request $request)
    {
        $company = $this->companyOrFail($request);

        $subscription = $this->payments->forCompany($company);
        $entitlement = $this->entitlements->forCompany($company);

        return $this->success([
            ...$entitlement->toArray(),
            'subscription' => $subscription ? new SubscriptionResource($subscription) : null,
        ], 'Usage retrieved.');
    }

    /**
     * Open a checkout for a different plan.
     *
     * Identical to `initialize` on the wire — upgrading and downgrading are the
     * same act of paying for a plan, and the new period starts only once the
     * gateway confirms. Kept as a named route so the client can express intent
     * and so the intent is greppable, not because the server treats them
     * differently: a downgrade can never take effect before its payment
     * succeeds, which is the behaviour the pricing page relies on.
     */
    public function changePlan(Request $request)
    {
        return $this->initialize($request);
    }

    /**
     * Renew the current plan before the period ends, by opening a checkout for
     * the plan already on the subscription. There is no silent auto-renewal
     * here: a renewal is a real charge, and it only extends the period once
     * the webhook confirms the payment.
     */
    public function renew(Request $request)
    {
        $company = $this->companyOrFail($request);

        $subscription = $this->payments->forCompany($company);

        abort_unless($subscription, 404, 'There is no subscription to renew.');

        $plan = $subscription->plan;

        abort_if($plan->isFree(), 422, 'The free plan does not renew. Choose a paid plan instead.');

        try {
            $result = $this->payments->initialize($request->user(), $plan, $subscription->gateway);
        } catch (InvalidArgumentException|RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success([
            'payment' => new PaymentResource($result['payment']),
            'checkout_url' => $result['checkout']->url,
            'plan' => $plan->slug,
        ], 'Renewal checkout created.', 201);
    }

    private function companyOrFail(Request $request): Company
    {
        $company = $request->user()->company;

        abort_unless($company, 403, 'No company profile is attached to this account.');

        return $company;
    }

    /**
     * Start a checkout for a plan.
     *
     * The client sends only the plan slug and an optional gateway. The amount,
     * currency and billing period are all read from the plan row, so a
     * tampered "amount" field is simply ignored — and rejected by validation.
     */
    public function initialize(Request $request)
    {
        $data = $request->validate([
            'plan' => ['required', 'string', 'exists:plans,slug'],
            'gateway' => ['nullable', 'string', Rule::in(array_column(PaymentGateway::cases(), 'value'))],
        ]);

        $plan = Plan::where('slug', $data['plan'])
            ->where('is_active', true)
            ->firstOrFail();

        if ($plan->isFree()) {
            return $this->error('This plan does not require payment.', 422);
        }

        try {
            $result = $this->payments->initialize($request->user(), $plan, $data['gateway'] ?? null);
        } catch (InvalidArgumentException|RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success([
            'payment' => new PaymentResource($result['payment']),
            'checkout_url' => $result['checkout']->url,
        ], 'Checkout created.', 201);
    }

    /**
     * The caller's own payments, scoped to their company. An employer can only
     * ever see billing history belonging to their own company.
     */
    public function index(Request $request)
    {
        $company = $this->companyOrFail($request);

        $payments = Payment::query()
            ->where('company_id', $company->id)
            ->with('plan:id,slug,name')
            ->orderByDesc('id')
            ->limit(min(100, max(1, (int) $request->input('per_page', 20))))
            ->get();

        return $this->success(PaymentResource::collection($payments), 'Payments retrieved.');
    }

    public function show(Request $request, string $reference)
    {
        $company = $this->companyOrFail($request);

        $payment = Payment::query()
            ->where('reference', $reference)
            ->where('company_id', $company->id)
            ->with('plan:id,slug,name')
            ->firstOrFail();

        return $this->success(new PaymentResource($payment), 'Payment retrieved.');
    }

    /**
     * The company's live subscription and what it entitles them to right now.
     */
    public function subscription(Request $request)
    {
        $company = $this->companyOrFail($request);

        $subscription = $this->payments->forCompany($company);

        return $this->success([
            'subscription' => $subscription ? new SubscriptionResource($subscription) : null,
        ], $subscription ? 'Subscription retrieved.' : 'No active subscription.');
    }

    /**
     * Cancel at period end. Entitlements continue until current_period_end, so
     * a customer is not locked out by cancelling early.
     */
    public function cancel(Request $request)
    {
        $company = $this->companyOrFail($request);

        $subscription = $this->payments->forCompany($company);

        abort_unless($subscription, 404, 'No active subscription to cancel.');

        $subscription->update(['cancelled_at' => now()]);

        return $this->success(
            new SubscriptionResource($subscription->fresh()),
            'Subscription will end on '.$subscription->current_period_end?->toFormattedDateString().'.'
        );
    }
}
