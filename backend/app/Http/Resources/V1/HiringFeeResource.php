<?php

namespace App\Http\Resources\V1;

use App\Services\HiringFeeService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A placement-fee charge, as the employer sees their own.
 *
 * Deliberately narrow: the employer needs to know what they owe, what they paid
 * and which application it was for. Revenue breakdowns by other employers are
 * an admin concern and are served by a different resource.
 */
class HiringFeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatter = app(HiringFeeService::class);

        return [
            'id' => $this->id,
            'application_id' => $this->application_id,
            'job_id' => $this->job_id,
            'job' => $this->job?->title,
            'candidate' => $this->application?->seeker?->name,
            'level' => $this->level?->value,
            'level_label' => $this->level?->label(),
            'amount' => $this->amount,
            'currency' => $this->currency,
            'formatted_amount' => $formatter->format((int) $this->amount, (string) $this->currency),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'reference' => $this->reference,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'paid_at_label' => $this->paid_at?->format('d M Y'),
            'checkout_url' => $this->payment?->checkout_url,
            // Lets the row render receipt actions without knowing the receipt is
            // keyed on the payment rather than on the fee. Read through
            // $this->resource because that is the model; bare $this-> forwards
            // through magic and hides the type from static analysis.
            'has_receipt' => $this->resource->isSettled(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
