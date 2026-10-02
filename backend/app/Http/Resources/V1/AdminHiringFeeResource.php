<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A placement-fee charge as the admin console sees it, including who paid and
 * for what job. Denormalised names are resolved here rather than in the
 * controller so the revenue tables and the CSV export cannot disagree.
 */
class AdminHiringFeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $minor = (int) $this->amount;
        $major = round($minor / 100, 2);

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'employer' => $this->employer?->name,
            'employer_email' => $this->employer?->email,
            'company' => $this->company?->name,
            'job' => $this->job?->title,
            'job_id' => $this->job_id,
            'candidate' => $this->application?->seeker?->name,
            'application_id' => $this->application_id,
            'level' => $this->level?->value,
            'level_label' => $this->level?->label(),
            'amount' => $minor,
            'amount_major' => $major,
            'currency' => $this->currency,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'percentage_applied' => $this->percentage_applied,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'paid_at_label' => $this->paid_at?->format('d M Y'),
            // Receipts are keyed on the payment, not on the fee, so the admin
            // table needs the payment reference to render receipt actions. Null
            // until a gateway checkout has been opened for this fee.
            'payment_reference' => $this->resource->payment?->reference,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
