<?php

namespace App\Payments;

use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Payments\Contracts\ChargeRequest;
use App\Payments\Data\CheckoutSession;
use App\Payments\Data\WebhookEvent;
use App\Services\HiringFeeService;
use App\Support\Notifier;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class PaymentService
{
    public function __construct(protected PaymentManager $manager) {}

    /**
     * Create a pending payment and open a hosted checkout.
     *
     * The payable amount is read from the plan on the server, so a tampered
     * request body cannot change what is charged.
     *
     * @return array{payment: Payment, checkout: CheckoutSession}
     */
    public function initialize(User $user, Plan $plan, ?string $gatewayName = null): array
    {
        $company = $user->company;

        if (! $company) {
            throw new InvalidArgumentException('Create a company profile before subscribing to a plan.');
        }

        $gatewayName = $gatewayName ?: (string) config('payments.default');
        $gateway = $this->manager->driver($gatewayName);

        if (! $gateway->isConfigured()) {
            throw new InvalidArgumentException("The {$gateway->name()->label()} gateway is not configured.");
        }

        if (! $gateway->name()->supportsCurrency($plan->currency)) {
            throw new InvalidArgumentException(
                "{$gateway->name()->label()} cannot charge in {$plan->currency}."
            );
        }

        // Reuse an unexpired pending payment for the same plan instead of
        // spawning a new gateway session (and a new row) on every click.
        $existing = Payment::query()
            ->where('user_id', $user->id)
            ->where('plan_id', $plan->id)
            ->where('gateway', $gateway->name()->value)
            ->whereIn('status', [PaymentStatus::Pending, PaymentStatus::Processing])
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if ($existing?->checkout_url) {
            return [
                'payment' => $existing,
                'checkout' => new CheckoutSession(url: $existing->checkout_url, gatewayReference: $existing->gateway_reference),
            ];
        }

        $payment = DB::transaction(fn () => Payment::create([
            'user_id' => $user->id,
            'company_id' => $company->id,
            'plan_id' => $plan->id,
            'purpose' => PaymentPurpose::Subscription,
            'gateway' => $gateway->name()->value,
            'status' => PaymentStatus::Pending,
            'amount' => $plan->price,
            'currency' => $plan->currency,
            'billing_period' => $plan->billing_period,
            'reference' => $this->generateReference(),
            'expires_at' => now()->addMinutes((int) config('payments.payment_expiry_minutes', 60)),
        ]));

        try {
            $checkout = $gateway->createCheckout(
                $payment,
                new ChargeRequest(
                    amount: (int) $plan->price,
                    currency: $plan->currency,
                    label: $plan->name.' plan',
                    description: $plan->tagline ?: 'Monthly HireHub subscription',
                    metadata: ['plan' => $plan->slug, 'company_id' => (string) $company->id],
                ),
                $user,
                $company,
            );
        } catch (\Throwable $e) {
            // The gateway refused, so no payment is outstanding. Do not leave a
            // dangling pending row that would block the next attempt.
            $payment->update(['status' => PaymentStatus::Failed, 'meta' => ['gateway_error' => $e->getMessage()]]);

            throw new RuntimeException($e->getMessage(), previous: $e);
        }

        $payment->update([
            'checkout_url' => $checkout->url,
            'gateway_reference' => $checkout->gatewayReference,
            'meta' => $checkout->meta,
        ]);

        return ['payment' => $payment->fresh(), 'checkout' => $checkout];
    }

    /**
     * Apply a verified gateway event.
     *
     * Idempotent: the unique (gateway, event_id) index means a replayed or
     * duplicated webhook is recorded once and applied once. A payment that has
     * already reached a final state is never transitioned again, so a late
     * "failed" event cannot clobber a successful charge.
     */
    public function apply(WebhookEvent $event): ?Payment
    {
        $payment = $this->findPayment($event);

        if (! $payment) {
            Log::warning("Payment webhook [{$event->type}] referenced an unknown reference.", [
                'gateway' => $event->gateway->value,
                'reference' => $event->reference,
            ]);

            return null;
        }

        try {
            return DB::transaction(function () use ($event, $payment) {
                // Claim the event first. If this insert hits the unique index the
                // event was already handled, so roll straight back to a no-op.
                $this->claimEvent($event, $payment);

                // Re-read under the transaction and lock the row so two
                // concurrent deliveries cannot both advance the state machine.
                $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);

                if ($payment->status->isFinal()) {
                    return $payment;
                }

                if (! $this->amountMatches($payment, $event)) {
                    $this->markEventError($payment, 'Amount or currency did not match the payment.');
                    Log::error('Payment webhook amount mismatch; entitlement withheld.', [
                        'payment_id' => $payment->id,
                        'expected' => $payment->amount.' '.$payment->currency,
                        'received' => $event->amount.' '.$event->currency,
                    ]);

                    return $payment;
                }

                $payment->update([
                    'status' => $event->status,
                    'paid_at' => $event->status === PaymentStatus::Succeeded ? now() : $payment->paid_at,
                ]);

                if ($event->status === PaymentStatus::Succeeded) {
                    // What the money entitles depends entirely on why the
                    // payment exists. A subscription grants a plan; a hiring
                    // fee confirms a hire. Getting this backwards would let a
                    // paid plan create a hire, so it is an explicit switch
                    // rather than an inferred one.
                    match ($payment->purpose) {
                        PaymentPurpose::HiringFee => $this->settleHiringFee($payment),
                        default => $this->settleSubscription($payment),
                    };
                }

                return $payment->fresh();
            });
        } catch (QueryException $e) {
            if (! $this->isUniqueViolation($e)) {
                throw $e;
            }

            // Duplicate (gateway, event_id): a replay. Nothing to do.
            Log::info("Duplicate payment webhook ignored [{$event->type}].");

            return $payment->fresh();
        }
    }

    /**
     * Grant the plan the employer just paid for.
     */
    protected function settleSubscription(Payment $payment): void
    {
        $this->grantSubscription($payment->fresh());

        Notifier::send($payment->user, [
            'category' => 'billing',
            'text' => 'Your '.$payment->plan->name.' plan payment was confirmed.',
            'link' => '/employer/billing',
            'type' => 'success',
            'icon' => 'credit-card',
            'subject' => 'Payment confirmed',
        ]);
    }

    /**
     * A placement fee pays for a hire, not a subscription. The hire, the job
     * closure and the seeker's notification all happen inside
     * HiringFeeService so there is exactly one implementation of them.
     */
    protected function settleHiringFee(Payment $payment): void
    {
        $applied = app(HiringFeeService::class)->settleForPayment($payment);

        if (! $applied) {
            Log::info('Hiring fee webhook arrived for an already-confirmed hire.', [
                'payment_id' => $payment->id,
            ]);

            return;
        }

        Notifier::send($payment->user, [
            'category' => 'billing',
            'text' => 'Your hiring fee was confirmed. The candidate has been marked as hired.',
            'link' => '/employer/applicants',
            'type' => 'success',
            'icon' => 'check2-circle',
            'subject' => 'Hiring fee paid',
        ]);
    }

    /**
     * Create or roll forward the company's live subscription.
     */
    protected function grantSubscription(Payment $payment): Subscription
    {
        $now = now();
        $periodEnd = $now->copy()->addMonth();

        $previous = Subscription::query()
            ->where('company_id', $payment->company_id)
            ->live()
            ->lockForUpdate()
            ->first();

        // Close the old row before opening the new one: the generated unique
        // column allows only one row with superseded_at = NULL per company.
        $previous?->update(['superseded_at' => $now, 'status' => SubscriptionStatus::Expired]);

        $subscription = Subscription::create([
            'user_id' => $payment->user_id,
            'company_id' => $payment->company_id,
            'plan_id' => $payment->plan_id,
            'payment_id' => $payment->id,
            'status' => SubscriptionStatus::Active,
            'gateway' => $payment->gateway->value,
            'starts_at' => $now,
            'current_period_end' => $periodEnd,
        ]);

        $payment->subscription()->associate($subscription);

        return $subscription;
    }

    /**
     * True only for a duplicate-key violation, so genuine database errors are
     * not silently swallowed as if they were webhook replays.
     */
    protected function isUniqueViolation(QueryException $e): bool
    {
        return ($e->errorInfo[0] ?? null) === '23000' || ($e->errorInfo[1] ?? null) === 1062;
    }

    protected function findPayment(WebhookEvent $event): ?Payment
    {
        if (! $event->reference) {
            return null;
        }

        return Payment::query()
            ->where('reference', $event->reference)
            ->orWhere('gateway_reference', $event->reference)
            ->first();
    }

    /**
     * Record the event, which both dedupes replays and leaves an audit trail.
     *
     * @throws QueryException on a duplicate (gateway, event_id)
     */
    protected function claimEvent(WebhookEvent $event, Payment $payment): void
    {
        PaymentEvent::create([
            'payment_id' => $payment->id,
            'gateway' => $event->gateway->value,
            'event_type' => $event->type,
            'gateway_event_id' => $event->eventId,
            'payload' => $this->redact($event->payload),
        ]);
    }

    protected function markEventError(Payment $payment, string $message): void
    {
        $event = PaymentEvent::where('payment_id', $payment->id)
            ->whereNull('processed_at')
            ->latest('id')
            ->first();

        $event?->update(['error' => $message]);
    }

    /**
     * The gateway's reported amount must match what we recorded at checkout.
     * A mismatch means the notification is about a different charge, so no
     * entitlement is granted.
     */
    protected function amountMatches(Payment $payment, WebhookEvent $event): bool
    {
        if ($event->amount === null) {
            return true;
        }

        if ($event->amount !== $payment->amount) {
            return false;
        }

        return $event->currency === null
            || strtoupper($event->currency) === strtoupper($payment->currency);
    }

    /**
     * Strip anything that must never be persisted from a provider payload.
     */
    protected function redact(array $payload): array
    {
        $blocked = ['authorization', 'card_number', 'cvv', 'pin', 'otp', 'secret', 'api_key'];

        $clean = function (array $data) use (&$clean, $blocked): array {
            foreach ($data as $key => $value) {
                if (in_array(strtolower((string) $key), $blocked, true)) {
                    $data[$key] = '[redacted]';
                } elseif (is_array($value)) {
                    $data[$key] = $clean($value);
                }
            }

            return $data;
        };

        return $clean($payload);
    }

    protected function generateReference(): string
    {
        do {
            $reference = 'hh_'.Str::lower(Str::random(16));
        } while (Payment::where('reference', $reference)->exists());

        return $reference;
    }

    public function forCompany(Company $company): ?Subscription
    {
        return Subscription::query()
            ->where('company_id', $company->id)
            ->live()
            ->with('plan')
            ->latest('id')
            ->first();
    }
}
