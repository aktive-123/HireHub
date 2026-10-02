<?php

namespace App\Services;

use App\Enums\PaymentGateway;
use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\Receipt;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Issues the printable receipt that backs a settled payment.
 *
 * Deliberately knows nothing about gateways, checkout or webhooks. It is handed
 * an already-succeeded `Payment` and records what was bought. That keeps the
 * "a receipt exists for this charge" guarantee independent of the payment
 * pipeline: a bug in checkout cannot lose receipts, and a bug in receipt
 * rendering cannot fail a payment, because a payment never waits on this class
 * to render.
 */
class ReceiptService
{
    /**
     * Issue the receipt for a payment, or return the one that already exists.
     *
     * Idempotent by `payment_id`. Webhook replays and the out-of-band hiring
     * fee confirmation path can both reach success for the same payment, and a
     * second receipt would mean a second "receipt number" for one charge.
     *
     * @throws \RuntimeException if the payment has not actually settled
     */
    public function issue(Payment $payment): Receipt
    {
        if (! $this->canIssue($payment)) {
            throw new \RuntimeException(sprintf(
                'Refusing to issue a receipt for payment %s: status is "%s". A receipt is a statement that money changed hands.',
                $payment->reference ?? (string) $payment->id,
                $payment->status->value,
            ));
        }

        $existing = Receipt::query()->where('payment_id', $payment->id)->first();

        if ($existing) {
            return $existing;
        }

        // A webhook replay and a customer opening the same receipt can land
        // together. Both see "no receipt yet", both try to insert, and the
        // unique index on payment_id turns the loser into a 500. Retry instead:
        // the winner's row is what both callers wanted.
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            try {
                return $this->write($payment);
            } catch (UniqueConstraintViolationException) {
                $existing = Receipt::query()->where('payment_id', $payment->id)->first();

                if ($existing) {
                    return $existing;
                }
            }
        }

        throw new \RuntimeException(sprintf(
            'Could not issue a receipt for payment %s: lost the insert race three times and no receipt was written.',
            $payment->reference ?? (string) $payment->id,
        ));
    }

    /**
     * Write the snapshot. Numbering is derived from the payment id rather than
     * from the receipt's own auto-increment id, which makes the number
     * knowable before the insert.
     *
     * That matters under concurrency: a number minted after the insert needs a
     * placeholder in between, and a shared placeholder collides with the unique
     * index on `number` for two *different* payments inserting at the same
     * moment - turning a recoverable race into a failure. Deriving it up front
     * means the row is written once, fully formed, in a single statement.
     *
     * Receipt numbers therefore skip, because payments that never settle leave
     * gaps. That is the desired behaviour for an audit trail: a gap is
     * explainable, a reused number is not.
     */
    protected function write(Payment $payment): Receipt
    {
        // Falls back to the payment's own timestamp rather than now(), so a
        // receipt backfilled years after the fact does not claim the money
        // changed hands at backfill time.
        $paidAt = $payment->paid_at ?? $payment->created_at ?? now();

        return Receipt::query()->create([
            'payment_id' => $payment->id,
            'number' => $this->numberFor($payment->id, $paidAt),
            'payer_name' => $payment->user?->name ?: 'HireHub member',
            'payer_email' => $payment->user?->email ?: '',
            'item_description' => $this->describe($payment),
            'amount' => (int) $payment->amount,
            'currency' => $payment->currency,
            'gateway_reference' => $payment->gateway_reference,
            'gateway' => $payment->gateway->value,
            'paid_at' => $paidAt,
        ]);
    }

    /**
     * Fetch a payment's receipt, minting it if this payment predates receipts.
     *
     * Backfills lazily rather than in a migration, because a receipt is a
     * snapshot of joins that have to be walked at read time (plan name, job
     * title, candidate name) and those cannot be reconstructed from the
     * payments table alone once the related rows change. On demand also means
     * a customer who downloads an old receipt gets one, without a backfill job
     * having to have run.
     */
    public function forPayment(Payment $payment): Receipt
    {
        return $payment->receipt ?: $this->issue($payment);
    }

    /**
     * A settled-only guarantee. A receipt is a statement that money changed
     * hands, so issuing one for a pending or failed payment would be a lie
     * that outlives the correction.
     */
    public function canIssue(Payment $payment): bool
    {
        return $payment->status === PaymentStatus::Succeeded;
    }

    /**
     * What the payer bought, in words a human recognises. A receipt reading
     * "plan_id 3" is technically accurate and practically useless.
     */
    private function describe(Payment $payment): string
    {
        return match ($payment->purpose) {
            PaymentPurpose::HiringFee => $this->describeHiringFee($payment),
            default => $this->describeSubscription($payment),
        };
    }

    private function describeSubscription(Payment $payment): string
    {
        $plan = $payment->plan;
        $period = $payment->billing_period ?: 'monthly';

        if (! $plan) {
            // Only reachable if the plan row was deleted after payment. The
            // charge still happened, so say what we can rather than nothing.
            return sprintf('HireHub subscription (%s billing)', $period);
        }

        return sprintf('%s plan - %s subscription', $plan->name, $period);
    }

    private function describeHiringFee(Payment $payment): string
    {
        $fee = $payment->hiringFee;

        if (! $fee?->job) {
            return 'Hiring confirmation fee';
        }

        $description = sprintf('Hiring confirmation fee - %s', $fee->job->title);

        if ($fee->company) {
            $description .= sprintf(' at %s', $fee->company->name);
        }

        $candidate = $fee->application?->seeker?->name;
        if ($candidate) {
            $description .= sprintf(' (candidate: %s)', $candidate);
        }

        return $description;
    }

    private function numberFor(int $id, mixed $createdAt): string
    {
        $year = $createdAt instanceof \DateTimeInterface
            ? $createdAt->format('Y')
            : now()->format('Y');

        return sprintf('HH-%s-%06d', $year, $id);
    }

    /**
     * Screen version of the receipt. Deliberately the same template the PDF
     * renders from, so "View" and "Download" can never disagree about what the
     * document says.
     */
    public function html(Receipt $receipt): string
    {
        return view('receipts.pdf', $this->viewData($receipt))->render();
    }

    /**
     * Real PDF file contents, not an HTML page with a print stylesheet.
     *
     * dompdf's font set is DejaVu, so the template asks for it by name: a
     * missing font here does not fall back gracefully, it drops glyphs.
     */
    public function pdf(Receipt $receipt): string
    {
        return Pdf::loadView('receipts.pdf', $this->viewData($receipt))
            ->setPaper('a4')
            ->output();
    }

    public function filename(Receipt $receipt): string
    {
        return sprintf('hirehub-receipt-%s.pdf', $receipt->number);
    }

    /**
     * @return array<string, mixed>
     */
    private function viewData(Receipt $receipt): array
    {
        $payment = $receipt->payment;

        return [
            'receipt' => $receipt,
            'paymentId' => $receipt->payment_id,
            'issuedAt' => $receipt->created_at ?? now(),
            'companyName' => $payment?->company?->name,
            'statusLabel' => $payment?->status->label() ?? ucfirst($receipt->gateway),
            'gatewayLabel' => $this->gatewayLabel($receipt->gateway),
            // Explicit rather than relying on the subtotal to equal the total:
            // a reader checking arithmetic should see where the difference
            // went, not wonder whether one was omitted by mistake.
            'zeroAmount' => Receipt::isoAmount(0, $receipt->currency),
        ];
    }

    private function gatewayLabel(string $gateway): string
    {
        $enum = PaymentGateway::tryFrom($gateway);

        return $enum?->label() ?? ucfirst($gateway);
    }
}
