<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\HiringFee;
use App\Models\Payment;
use App\Services\ReceiptService;
use Illuminate\Http\Request;

/**
 * Serves the printable receipt for a settled payment.
 *
 * Two surfaces, one service: an employer can read and download receipts for
 * their own company, an admin can read and download any receipt on the
 * platform. The employer scope is enforced in the query rather than after the
 * lookup, because a receipt carries a payer's name, email and transaction id —
 * answering "not yours" for someone else's reference would still confirm that
 * the reference exists.
 */
class ReceiptController extends ApiController
{
    public function __construct(protected ReceiptService $receipts) {}

    public function show(Request $request, string $reference)
    {
        $receipt = $this->receipts->forPayment($this->scopedPayment($request, $reference));

        return response($this->receipts->html($receipt), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function download(Request $request, string $reference)
    {
        $receipt = $this->receipts->forPayment($this->scopedPayment($request, $reference));

        // Rendered once and reused: dompdf is the slowest thing in this
        // request, so calling it twice to measure and to return would double
        // the response time for no reason.
        $pdf = $this->receipts->pdf($receipt);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => sprintf('attachment; filename="%s"', $this->receipts->filename($receipt)),
            'Content-Length' => (string) strlen($pdf),
        ]);
    }

    /**
     * Same document, addressed by the hiring fee's reference instead of the
     * payment's, because that is the identifier the Placement Fees table
     * already has on each row.
     */
    public function showForHiringFee(Request $request, string $reference)
    {
        $receipt = $this->receipts->forPayment($this->scopedHiringFeePayment($request, $reference));

        return response($this->receipts->html($receipt), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function downloadForHiringFee(Request $request, string $reference)
    {
        $receipt = $this->receipts->forPayment($this->scopedHiringFeePayment($request, $reference));

        $pdf = $this->receipts->pdf($receipt);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => sprintf('attachment; filename="%s"', $this->receipts->filename($receipt)),
            'Content-Length' => (string) strlen($pdf),
        ]);
    }

    /**
     * Resolve a reference the caller is allowed to see, or 404.
     *
     * An employer is pinned to their own company. An admin is not scoped,
     * because seeing every transaction is the job.
     */
    private function scopedPayment(Request $request, string $reference): Payment
    {
        $user = $request->user();

        $query = Payment::query()->where('reference', $reference);

        if (! $user->isAdmin()) {
            // Scoped, not filtered afterwards. An employer passing another
            // company's reference gets the same 404 as a reference that never
            // existed.
            $query->where('company_id', $user->company?->id);
        }

        $payment = $query->first();

        abort_if(! $payment, 404, 'No payment exists with that reference.');
        abort_unless(
            $this->receipts->canIssue($payment),
            409,
            'A receipt is only issued for a settled payment. This transaction has not been paid.'
        );

        return $payment;
    }

    /**
     * A quoted-but-unpaid fee has no payment behind it, and therefore no
     * receipt. Saying so plainly beats a 404 that reads like a missing row.
     */
    private function scopedHiringFeePayment(Request $request, string $reference): Payment
    {
        $query = HiringFee::query()->where('reference', $reference)->whereNotNull('payment_id');

        if (! $request->user()->isAdmin()) {
            $query->where('company_id', $request->user()->company?->id);
        }

        $fee = $query->first();

        abort_if(! $fee, 404, 'No paid hiring fee exists with that reference.');

        $payment = $fee->payment;

        abort_unless(
            $payment && $this->receipts->canIssue($payment),
            409,
            'This hiring fee has not been paid, so there is no receipt yet.'
        );

        return $payment;
    }
}
