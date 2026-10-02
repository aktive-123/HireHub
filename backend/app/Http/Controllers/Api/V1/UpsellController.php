<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\Application;
use App\Services\Upsell\UpsellService;
use Illuminate\Http\Request;

/**
 * Paid add-ons a job seeker can buy against a hire they have already accepted.
 *
 * Separate from the employer's billing controllers because the payer is a
 * person, not a company, and every authorisation here is scoped by seeker_id
 * rather than by company.
 */
class UpsellController extends ApiController
{
    public function __construct(protected UpsellService $upsells) {}

    /**
     * What this seeker may still buy against this application.
     *
     * Returns an empty list for anything that is not an accepted hire, so the
     * endpoint is safe to call at any point in the flow and cannot be used to
     * discover what is purchasable by probing applications.
     */
    public function index(Request $request, $id)
    {
        $application = $this->seekerApplication($request, $id);

        return $this->success(
            ['items' => $this->upsells->catalogueFor($application)],
            'Add-ons retrieved.'
        );
    }

    public function checkout(Request $request, $id)
    {
        $application = $this->seekerApplication($request, $id);

        $validated = $request->validate([
            'sku' => ['required', 'string', 'max:64'],
        ]);

        try {
            $upsell = $this->upsells->checkout($application, $validated['sku']);
        } catch (\RuntimeException $e) {
            // The service refuses for reasons the buyer can act on (not hired
            // yet, already bought, add-on withdrawn), so these are 422s rather
            // than 500s.
            return $this->error($e->getMessage(), 422, null, [], 'upsell_unavailable');
        }

        return $this->success([
            'upsell' => [
                'sku' => $upsell->sku,
                'reference' => $upsell->reference,
                'amount' => $upsell->getAmount(),
                'currency' => $upsell->getCurrency(),
                'status' => $upsell->status->value,
            ],
            'checkout_url' => $upsell->checkout_url,
        ], 'Add-on checkout created.', 201);
    }

    /**
     * Scoped by seeker_id so somebody else's application is a 404 rather than
     * a 403 that confirms it exists.
     */
    private function seekerApplication(Request $request, $id): Application
    {
        return Application::with(['job:id,title,company_id', 'seeker:id,name'])
            ->where('seeker_id', $request->user()->id)
            ->findOrFail($id);
    }
}
