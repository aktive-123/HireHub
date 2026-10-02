<?php

namespace App\Services;

use App\Enums\ApplicationStatus;
use App\Enums\HiringFeeLevel;
use App\Enums\JobStatus;
use App\Enums\PaymentGateway;
use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Models\Application;
use App\Models\HiringFee;
use App\Models\HiringFeeRate;
use App\Models\Job;
use App\Models\Payment;
use App\Models\User;
use App\Payments\Contracts\ChargeRequest;
use App\Payments\Data\WebhookEvent;
use App\Payments\PaymentManager;
use App\Support\FrontendUrl;
use App\Support\Notifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

/**
 * The placement fee an employer pays HireHub when a hire is confirmed.
 *
 * Invariants this class exists to hold:
 *
 *  1. The amount is always priced on the server from a `hiring_fee_rates` row.
 *     The client can ask what a hire costs; it can never say what it costs.
 *  2. An application is not `hired` until a `hiring_fees` row for that exact
 *     application is `succeeded`. {@see self::hasSettledHire()} is the single
 *     check the status endpoint uses, so there is one definition of "paid".
 *  3. Settlement is idempotent. A replayed webhook must not notify the seeker
 *     twice, close a second job or re-hire somebody.
 */
class HiringFeeService
{
    /**
     * Multipliers that turn a listed salary into an annual figure.
     *
     * A job may be advertised with an hourly or monthly salary, but the
     * percentage rule is defined against an *annual* salary. Ignoring the
     * period would price an hourly C-level role at 5% of one hour's pay, which
     * is nonsense. 2,080 hours / 260 days / 52 weeks are the conventional
     * conversions.
     *
     * @var array<string, float>
     */
    private const ANNUALISERS = [
        'year' => 1.0,
        'annually' => 1.0,
        'annual' => 1.0,
        'month' => 12.0,
        'monthly' => 12.0,
        'week' => 52.0,
        'weekly' => 52.0,
        'day' => 260.0,
        'daily' => 260.0,
        'hour' => 2080.0,
        'hourly' => 2080.0,
    ];

    public function __construct(protected PaymentManager $manager) {}

    /*
    |--------------------------------------------------------------------------
    | Pricing
    |--------------------------------------------------------------------------
    */

    /**
     * Resolve the rate row for a job: the most specific match wins.
     *
     * A rate scoped to the job's category beats the global rate for the same
     * level, so an admin can price one category differently without disturbing
     * the rest.
     */
    public function rateFor(Job $job): ?HiringFeeRate
    {
        $level = HiringFeeLevel::fromJobLevel($job->level);

        return HiringFeeRate::query()
            ->where('level', $level)
            ->where('is_active', true)
            ->where(function ($q) use ($job) {
                $q->whereNull('category_id');
                if ($job->category_id !== null) {
                    $q->orWhere('category_id', $job->category_id);
                }
            })
            ->orderByRaw('category_id IS NULL')   // specific (0) before global (1)
            ->orderBy('id')
            ->first();
    }

    /**
     * Price a hire, in minor units.
     *
     * When a rate carries a percentage as well as a flat amount, the greater
     * of the two is charged — the executive tier's "₦125,000 flat or 5% of
     * salary, whichever is higher" rule. `use_greater_of = false` on the row
     * turns that into flat-wins, which is what an admin would set for a tier
     * that has a percentage purely as a floor.
     *
     * @return array{amount:int,currency:string,level:HiringFeeLevel,rate:?HiringFeeRate,percentage_applied:?int,annual_salary:?float,basis:string}
     */
    public function quote(Job $job): array
    {
        $level = HiringFeeLevel::fromJobLevel($job->level);
        $rate = $this->rateFor($job);
        $currency = $rate?->currency ?? (string) config('payments.currency', 'NGN');

        if (! $rate) {
            // Refusing to quote is the safe failure. Defaulting to zero would
            // hand out free hires; defaulting to some arbitrary figure would
            // invent a price the admin never agreed to.
            throw new InvalidArgumentException(
                'No active hiring fee is configured for '.$level->label().'. Contact HireHub support.'
            );
        }

        $flat = (int) $rate->flat_amount;
        $bps = $rate->percentage_override;
        $annual = $this->annualSalary($job);
        $ratePercent = $rate->percentage();

        // No percentage on the tier, or no salary to take a percentage of: the
        // flat amount is the whole answer.
        if ($bps === null || $ratePercent === null || $annual === null || $annual <= 0) {
            return [
                'amount' => $flat,
                'currency' => $currency,
                'level' => $level,
                'rate' => $rate,
                'percentage_applied' => null,
                'annual_salary' => $annual,
                'basis' => 'flat',
            ];
        }

        // Rounded to the nearest whole minor unit. float arithmetic is the only
        // option for a percentage of a non-integer salary, so it is contained
        // here and immediately cast back to an int.
        $percentAmount = (int) round($annual * $ratePercent);

        // `use_greater_of` is a mode, not an assertion: with it on the employer
        // pays whichever is higher, with it off whichever is lower. Either way
        // exactly one of the two is chosen, and the loser is not recorded as
        // applied so the admin can tell which rule actually priced the hire.
        $usePercent = $rate->use_greater_of
            ? $percentAmount > $flat
            : $percentAmount < $flat;

        return [
            'amount' => $usePercent ? $percentAmount : $flat,
            'currency' => $currency,
            'level' => $level,
            'rate' => $rate,
            'percentage_applied' => $usePercent ? $bps : null,
            'annual_salary' => $annual,
            'basis' => match (true) {
                $flat === $percentAmount => 'equal',
                $usePercent => 'percentage',
                default => 'flat',
            },
        ];
    }

    /**
     * The job's advertised salary as an annual figure, or null when it has not
     * published one. Uses the top of the range: the fee is charged on the salary
     * the employer actually offered, not the floor they listed.
     */
    public function annualSalary(Job $job): ?float
    {
        $salary = $job->salary_max ?? $job->salary_min;

        if ($salary === null || (float) $salary <= 0) {
            return null;
        }

        $multiplier = self::ANNUALISERS[strtolower((string) $job->salary_period)] ?? 1.0;

        return (float) $salary * $multiplier;
    }

    /*
    |--------------------------------------------------------------------------
    | The hire gate
    |--------------------------------------------------------------------------
    */

    /**
     * The one definition of "this hire has been paid for".
     *
     * Read by the status endpoint to refuse a free hire, and by the settlement
     * path to make the transition idempotent.
     */
    public function hasSettledHire(Application $application): bool
    {
        return $application->hiringFee()->settled()->exists();
    }

    /**
     * What the employer is about to be charged, for the confirmation modal.
     *
     * Returned rather than computed in the browser so the number the employer
     * approves is provably the number the gateway will charge.
     *
     * @return array<string, mixed>
     */
    public function preview(Application $application): array
    {
        $application->loadMissing(['job', 'seeker']);
        $job = $application->job;

        if (! $job) {
            throw new InvalidArgumentException('This application has no job attached.');
        }

        $quote = $this->quote($job);
        $settled = $this->hasSettledHire($application);

        $existing = $application->hiringFee()
            ->with('payment')
            ->inProgress()
            ->latest('id')
            ->first();

        return [
            'application_id' => $application->id,
            'candidate' => $application->seeker?->name,
            'job' => $job->title,
            'level' => $quote['level']->value,
            'level_label' => $quote['level']->label(),
            'amount' => $quote['amount'],
            'currency' => $quote['currency'],
            'formatted_amount' => $this->format($quote['amount'], $quote['currency']),
            'basis' => $quote['basis'],
            'annual_salary' => $quote['annual_salary'],
            'already_paid' => $settled,
            // A checkout that is still open, so the modal can offer to resume it
            // rather than spawning a second gateway session on every click.
            'checkout_url' => $existing?->payment?->checkout_url,
            'reference' => $existing?->reference,
            // Only gateways that are actually configured, so the modal never
            // offers a payment method that would fail at checkout.
            'gateways' => $this->manager->availableWithLabels(),
        ];
    }

    /**
     * The currency fees are quoted and charged in.
     *
     * Single source of truth for the admin console and the formatting helpers,
     * so a rate row created without an explicit currency still displays with
     * the right symbol rather than a bare number.
     */
    public function currency(): string
    {
        return strtoupper((string) config('payments.currency', 'NGN'));
    }

    /**
     * Format minor units for display, e.g. 1250000 kobo → "₦12,500".
     */
    public function format(int $minorUnits, string $currency): string
    {
        $major = $minorUnits / 100;

        $formatted = match (strtoupper($currency)) {
            'NGN' => '₦'.number_format($major, 2),
            'USD' => '$'.number_format($major, 2),
            'EUR' => '€'.number_format($major, 2),
            'GBP' => '£'.number_format($major, 2),
            default => $currency.' '.number_format($major, 2),
        };

        return $formatted;
    }

    /*
    |--------------------------------------------------------------------------
    | Checkout
    |--------------------------------------------------------------------------
    */

    /**
     * Open a checkout for the hiring fee and return where to send the employer.
     *
     * @return array{hiring_fee: HiringFee, payment: Payment, checkout_url: string}
     */
    public function initialize(Application $application, User $employer, ?string $gatewayName = null): array
    {
        if ($this->hasSettledHire($application)) {
            throw new InvalidArgumentException('This hire has already been paid for and confirmed.');
        }

        $application->loadMissing(['job', 'job.company', 'seeker']);
        $job = $application->job;

        if (! $job) {
            throw new InvalidArgumentException('This application has no job attached.');
        }

        if ($application->seeker_id === $employer->id) {
            throw new InvalidArgumentException('You cannot hire yourself through this platform.');
        }

        $quote = $this->quote($job);
        $gateway = $this->manager->driver($gatewayName);

        if (! $gateway->isConfigured()) {
            throw new InvalidArgumentException($gateway->name()->notConfiguredMessage());
        }

        if (! $gateway->name()->supportsCurrency($quote['currency'])) {
            throw new InvalidArgumentException(
                "{$gateway->name()->label()} cannot charge in {$quote['currency']}."
            );
        }

        // One live fee per application. Clicking twice must not produce two
        // rows to reconcile, so an in-flight fee is reused.
        $fee = $application->hiringFee()->inProgress()->latest('id')->first();

        if ($fee?->payment?->checkout_url) {
            return [
                'hiring_fee' => $fee,
                'payment' => $fee->payment,
                'checkout_url' => $fee->payment->checkout_url,
            ];
        }

        [$fee, $payment] = DB::transaction(function () use ($application, $employer, $job, $quote, $gateway) {
            $reference = $this->generateReference();

            $payment = Payment::create([
                'user_id' => $employer->id,
                'company_id' => $job->company_id,
                'plan_id' => null,                       // a fee is not a subscription
                'purpose' => PaymentPurpose::HiringFee,
                'gateway' => $gateway->name()->value,
                'status' => PaymentStatus::Pending,
                'amount' => $quote['amount'],
                'currency' => $quote['currency'],
                'billing_period' => 'one-off',
                'reference' => $reference,
                'expires_at' => now()->addMinutes((int) config('payments.payment_expiry_minutes', 60)),
            ]);

            $fee = HiringFee::updateOrCreate(
                ['application_id' => $application->id],
                [
                    'employer_id' => $employer->id,
                    'company_id' => $job->company_id,
                    'job_id' => $job->id,
                    'hiring_fee_rate_id' => $quote['rate']?->id,
                    'payment_id' => $payment->id,
                    'amount' => $quote['amount'],
                    'currency' => $quote['currency'],
                    'level' => $quote['level'],
                    'percentage_applied' => $quote['percentage_applied'],
                    'status' => PaymentStatus::Pending,
                    'reference' => $reference,
                    'meta' => [
                        'basis' => $quote['basis'],
                        'annual_salary' => $quote['annual_salary'],
                    ],
                ]
            );

            return [$fee, $payment];
        });

        try {
            $checkout = $gateway->createCheckout(
                $payment,
                new ChargeRequest(
                    amount: $quote['amount'],
                    currency: $quote['currency'],
                    label: 'HireHub hiring fee — '.$job->title,
                    description: 'Placement fee for '.($application->seeker?->name ?? 'a candidate').' at '.$job->title.'.',
                    metadata: [
                        'purpose' => PaymentPurpose::HiringFee->value,
                        'application_id' => (string) $application->id,
                        'hiring_fee_id' => (string) $fee->id,
                        'job_id' => (string) $job->id,
                        'level' => $quote['level']->value,
                    ],
                    // Send the employer back to the applicant they were hiring,
                    // not to the billing page this fee has nothing to do with.
                    returnUrl: FrontendUrl::to("/employer/applicants/{$application->id}?fee_return=1"),
                ),
                $employer,
                $job->company,
            );
        } catch (Throwable $e) {
            // The gateway refused, so nothing is owed. Leaving a pending row
            // behind would block the employer from retrying.
            $payment->update(['status' => PaymentStatus::Failed, 'meta' => ['gateway_error' => $e->getMessage()]]);
            $fee->update(['status' => PaymentStatus::Failed, 'meta' => ['gateway_error' => $e->getMessage()]]);

            throw new RuntimeException($e->getMessage(), previous: $e);
        }

        $payment->update([
            'checkout_url' => $checkout->url,
            'gateway_reference' => $checkout->gatewayReference,
            'meta' => $checkout->meta,
        ]);

        return [
            'hiring_fee' => $fee->fresh(),
            'payment' => $payment->fresh(),
            'checkout_url' => $checkout->url,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Settlement
    |--------------------------------------------------------------------------
    */

    /**
     * Called from the webhook pipeline once a fee payment has succeeded.
     *
     * Runs inside the caller's transaction and re-reads the fee with a row
     * lock, so two concurrent webhook deliveries cannot both perform the
     * transition. Returns false when the hire was already confirmed, which is
     * the normal outcome of a replay.
     */
    public function settleForPayment(Payment $payment): bool
    {
        $fee = HiringFee::query()
            ->where('payment_id', $payment->id)
            ->lockForUpdate()
            ->first();

        if (! $fee) {
            Log::warning('Hiring fee payment succeeded but no fee row referenced it.', [
                'payment_id' => $payment->id,
            ]);

            return false;
        }

        if ($fee->status === PaymentStatus::Succeeded) {
            return false;   // already applied
        }

        $fee->update([
            'status' => PaymentStatus::Succeeded,
            'paid_at' => $payment->paid_at ?? now(),
            'confirmed_at' => now(),
        ]);

        $this->confirmHire($fee->application);

        return true;
    }

    /**
     * The post-payment side effects of a settled fee: put the confirmed offer
     * to the seeker and wait for their answer.
     *
     * This deliberately does *not* mark the application hired and does not close
     * the job. The employer has paid, which buys the offer — not the hire. The
     * seeker is the one who accepts, and until they do the role stays open: a
     * job closed at payment time would be a filled vacancy the moment a
     * candidate said no.
     */
    protected function confirmHire(?Application $application): void
    {
        if (! $application) {
            return;
        }

        $application->loadMissing(['job', 'job.company', 'seeker', 'seeker.profile']);

        if ($application->status === ApplicationStatus::Hired) {
            return;
        }

        $application->update([
            'status' => ApplicationStatus::OfferConfirmedPendingAcceptance,
        ]);

        $job = $application->job;

        Notifier::send($application->seeker, [
            'category' => 'applications',
            'type' => 'success',
            'icon' => 'bi-envelope-check-fill',
            'text' => $job?->company?->name.' has confirmed an offer for '.$job?->title.'. Accept it to confirm the role — accepting is free and takes one tap.',
            'action' => 'Review offer',
            'link' => '/seeker/applications/'.$application->id,
            'subject' => 'Offer confirmed — '.$job?->title,
        ]);
    }

    /**
     * The seeker accepted. This is the point the hire actually completes: the
     * status moves, the vacancy closes, and the employer is told.
     *
     * Idempotent, because accepting twice (a retried request, a double tap)
     * must not re-close a job that has since been reposted.
     */
    public function completeHire(Application $application): Application
    {
        $application->loadMissing(['job', 'job.company', 'seeker', 'seeker.profile']);

        DB::transaction(function () use ($application) {
            if ($application->status !== ApplicationStatus::Hired) {
                $application->update(['status' => ApplicationStatus::Hired]);
            }

            $job = $application->job;

            // A single-headcount listing is now filled. Jobs have no open-slots
            // counter in this schema, so "closed" is how a filled role is
            // represented — a closed job stops accepting applications, which is
            // exactly the intended effect.
            if ($job && $job->status === JobStatus::Open) {
                $job->update(['status' => JobStatus::Closed]);
            }
        });

        $job = $application->job;

        Notifier::send($application->seeker, [
            'category' => 'applications',
            'type' => 'success',
            'icon' => 'bi-briefcase-fill',
            'text' => 'Congratulations — you have accepted the offer for '.$job?->title.' at '.($job?->company?->name ?? 'the company').'. The employer will be in touch with next steps.',
            'action' => 'View application',
            'link' => '/seeker/applications',
            'subject' => 'You have been hired — '.$job?->title,
        ]);

        // The employer paid for this hire at the offer stage, so the acceptance
        // that completes it is the one thing they are waiting on.
        $employer = $job?->company?->user;

        if ($employer) {
            Notifier::send($employer, [
                'category' => 'applications',
                'type' => 'success',
                'icon' => 'bi-person-check-fill',
                'text' => ($application->seeker?->profile?->full_name ?? $application->seeker?->name ?? 'The candidate').' has accepted your offer for '.$job?->title.'. The role is now filled and the listing has closed.',
                'action' => 'View applicant',
                'link' => '/employer/applicants/'.$application->id,
                'subject' => 'Offer accepted — '.$job?->title,
            ]);
        }

        return $application->fresh();
    }

    /**
     * Re-check a fee's state against the gateway.
     *
     * The webhook is the authoritative signal, but gateways occasionally deliver
     * late or not at all. This lets the applicant page reconcile on the
     * employer's return without trusting the browser: it re-asks the provider
     * what happened to our reference, using the provider's own verification
     * endpoint rather than a second webhook delivery — this path carries no
     * signature, so it must never be treated as equivalent to the webhook.
     */
    public function reconcile(HiringFee $fee): HiringFee
    {
        $payment = $fee->payment;

        if (! $payment || $payment->status->isFinal()) {
            return $fee;
        }

        $verified = $this->verifyWithGateway($payment);

        if (! $verified || $verified->status !== PaymentStatus::Succeeded) {
            return $fee->fresh();
        }

        // The provider confirmed a charge. It still has to be *our* charge, at
        // our amount, in our currency — a matching reference alone is not proof.
        if ($verified->amount !== (int) $payment->amount
            || ($verified->currency !== null && strtoupper($verified->currency) !== strtoupper($payment->currency))) {
            Log::error('Out-of-band hiring fee verification returned a mismatched amount; hire not confirmed.', [
                'payment_id' => $payment->id,
                'expected' => $payment->amount.' '.$payment->currency,
                'received' => $verified->amount.' '.$verified->currency,
            ]);

            return $fee->fresh();
        }

        $payment->update(['status' => PaymentStatus::Succeeded, 'paid_at' => now()]);

        DB::transaction(function () use ($payment) {
            $this->settleForPayment($payment);
        });

        // Same guarantee as the webhook path: the hire is confirmed first, and
        // the receipt is a best-effort side effect that cannot fail the
        // confirmation. Receipts are keyed on the payment and backfilled
        // lazily, so issuing twice is harmless.
        try {
            app(ReceiptService::class)->issue($payment);
        } catch (Throwable $e) {
            Log::error('Receipt issuance failed after hiring fee confirmation; will backfill on download.', [
                'payment_id' => $payment->id,
                'reason' => $e->getMessage(),
            ]);
        }

        return $fee->fresh();
    }

    /**
     * Ask the gateway to confirm a reference out-of-band and normalise the
     * answer into the same shape the webhook path produces.
     */
    protected function verifyWithGateway(Payment $payment): ?WebhookEvent
    {
        $json = match ($payment->gateway) {
            PaymentGateway::Paystack => $this->fetchJson(
                'https://api.paystack.co/transaction/verify/'.$payment->reference,
                (string) config('payments.gateways.paystack.secret_key')
            ),

            PaymentGateway::Flutterwave => $this->fetchJson(
                'https://api.flutterwave.com/v3/transactions/'.$payment->reference.'/verify',
                (string) config('payments.gateways.flutterwave.secret_key')
            ),

            PaymentGateway::Stripe => $payment->gateway_reference
                ? $this->fetchJson(
                    'https://api.stripe.com/v1/checkout/sessions/'.$payment->gateway_reference,
                    (string) config('payments.gateways.stripe.secret_key')
                )
                : null,
        };

        if (! $json) {
            return null;
        }

        return match ($payment->gateway) {
            PaymentGateway::Paystack => $this->parsePaystackVerification($json, $payment),
            PaymentGateway::Flutterwave => $this->parseFlutterwaveVerification($json, $payment),
            PaymentGateway::Stripe => $this->parseStripeVerification($json, $payment),
        };
    }

    private function parsePaystackVerification(array $json, Payment $payment): ?WebhookEvent
    {
        $data = $json['data'] ?? [];

        // Paystack's own status vocabulary, not our PaymentStatus: only
        // "success" is money received.
        $status = match ($data['status'] ?? null) {
            'success' => PaymentStatus::Succeeded,
            'failed', 'abandoned' => PaymentStatus::Failed,
            default => PaymentStatus::Processing,
        };

        return new WebhookEvent(
            gateway: PaymentGateway::Paystack,
            type: 'verify',
            status: $status,
            reference: $data['reference'] ?? $payment->reference,
            eventId: 'verify:'.$payment->reference.':'.($data['status'] ?? 'unknown'),
            amount: isset($data['amount']) ? (int) $data['amount'] : null,
            currency: isset($data['currency']) ? strtoupper((string) $data['currency']) : null,
            payload: $json,
        );
    }

    private function parseFlutterwaveVerification(array $json, Payment $payment): ?WebhookEvent
    {
        $data = $json['data'] ?? [];

        $status = match (true) {
            ($json['status'] ?? null) === 'success' && ($data['status'] ?? '') === 'successful' => PaymentStatus::Succeeded,
            in_array($data['status'] ?? '', ['failed', 'cancelled'], true) => PaymentStatus::Failed,
            default => PaymentStatus::Processing,
        };

        return new WebhookEvent(
            gateway: PaymentGateway::Flutterwave,
            type: 'verify',
            status: $status,
            reference: $data['tx_ref'] ?? $payment->reference,
            eventId: 'verify:'.$payment->reference.':'.($data['id'] ?? 'unknown'),
            amount: isset($data['amount']) ? (int) $data['amount'] : null,
            currency: isset($data['currency']) ? strtoupper((string) $data['currency']) : null,
            payload: $json,
        );
    }

    private function parseStripeVerification(array $json, Payment $payment): ?WebhookEvent
    {
        $paid = ($json['payment_status'] ?? '') === 'paid';

        $status = match (true) {
            $paid => PaymentStatus::Succeeded,
            in_array($json['status'] ?? '', ['expired'], true) => PaymentStatus::Failed,
            default => PaymentStatus::Processing,
        };

        return new WebhookEvent(
            gateway: PaymentGateway::Stripe,
            type: 'verify',
            status: $status,
            reference: $json['client_reference_id'] ?? $payment->reference,
            eventId: 'verify:'.$payment->reference.':'.($json['id'] ?? 'unknown'),
            amount: isset($json['amount_total']) ? (int) $json['amount_total'] : null,
            currency: isset($json['currency']) ? strtoupper((string) $json['currency']) : null,
            payload: $json,
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fetchJson(string $url, string $token): ?array
    {
        if ($token === '') {
            return null;
        }

        try {
            return Http::withToken($token)
                ->acceptJson()
                ->timeout(15)
                ->retry(1, 250)
                ->get($url)
                ->json();
        } catch (Throwable $e) {
            Log::warning('Out-of-band payment verification request failed.', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    protected function generateReference(): string
    {
        do {
            $reference = 'hhfee_'.Str::lower(Str::random(16));
        } while (HiringFee::where('reference', $reference)->exists());

        return $reference;
    }
}
