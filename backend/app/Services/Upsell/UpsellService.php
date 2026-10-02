<?php

namespace App\Services\Upsell;

use App\Enums\ApplicationStatus;
use App\Enums\PaymentStatus;
use App\Models\Application;
use App\Models\JobSeekerUpsell;
use App\Models\User;
use App\Payments\Contracts\Chargeable;
use App\Payments\Contracts\ChargeRequest;
use App\Payments\Data\WebhookEvent;
use App\Payments\PaymentManager;
use App\Support\Notifier;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Buying and settling a job seeker add-on.
 *
 * Structurally parallel to PaymentService but deliberately not shared with it:
 * an upsell has no company and no plan, so the entitlement it grants (an
 * interview slot) lives here rather than in the subscription path. What it does
 * reuse is the gateway layer, through {@see Chargeable},
 * so signature verification and out-of-band verification behave identically for
 * both kinds of money.
 */
class UpsellService
{
    public function __construct(protected PaymentManager $gateways) {}

    /**
     * Open checkout for one add-on against an accepted offer.
     *
     * The price comes from the catalogue and the amount from the request is
     * ignored entirely — there is no amount in the request at all, which is the
     * cheapest possible way to be sure it cannot be tampered with.
     */
    public function checkout(Application $application, string $sku, ?string $gatewayName = null): JobSeekerUpsell
    {
        $product = UpsellCatalogue::find($sku);

        if (! $product) {
            throw new RuntimeException('That add-on is not available.');
        }

        if ($application->status !== ApplicationStatus::Hired) {
            throw new RuntimeException('Add-ons are available once you have accepted your offer.');
        }

        // Re-offering something already bought is a no-op, not a second charge.
        $already = JobSeekerUpsell::query()
            ->where('application_id', $application->id)
            ->where('sku', $sku)
            ->settled()
            ->first();

        if ($already) {
            throw new RuntimeException('You already have this add-on.');
        }

        $gatewayName = $gatewayName ?: (string) config('payments.default');
        $gateway = $this->gateways->driver($gatewayName);

        if (! $gateway->isConfigured()) {
            throw new RuntimeException($gateway->name()->notConfiguredMessage());
        }

        if (! $gateway->name()->supportsCurrency($product['currency'])) {
            throw new RuntimeException("{$gateway->name()->label()} cannot charge in {$product['currency']}.");
        }

        $upsell = JobSeekerUpsell::create([
            'user_id' => $application->seeker_id,
            'application_id' => $application->id,
            'sku' => $sku,
            'amount' => $product['amount'],
            'currency' => $product['currency'],
            'gateway' => $gateway->name()->value,
            'reference' => $this->generateReference(),
            'status' => PaymentStatus::Pending,
        ]);

        try {
            $session = $gateway->createCheckout(
                $upsell,
                new ChargeRequest(
                    amount: (int) $product['amount'],
                    currency: $product['currency'],
                    label: $product['name'],
                    description: $product['summary'],
                    metadata: ['upsell_id' => (string) $upsell->id, 'sku' => $sku],
                    // The seeker bought this off the back of a hire, so send
                    // them back to that application rather than the employer
                    // billing page the shared return route assumes.
                    returnUrl: route('payments.return', ['reference' => $upsell->reference])
                        .'?scope=seeker',
                ),
                $application->seeker,
                null,
            );
        } catch (Throwable $e) {
            // No money is outstanding, so do not leave a pending row that would
            // look like a live charge in reporting.
            $upsell->update(['status' => PaymentStatus::Failed, 'error' => $e->getMessage()]);

            throw new RuntimeException($e->getMessage(), previous: $e);
        }

        $upsell->update([
            'checkout_url' => $session->url,
            'gateway_reference' => $session->gatewayReference,
        ]);

        return $upsell->fresh();
    }

    /**
     * Settle a verified gateway event against an upsell.
     *
     * Returns the settled row, or null when the reference is not an upsell at
     * all — which is the normal case, because the same webhook route receives
     * every kind of charge and PaymentService gets first refusal.
     */
    public function apply(WebhookEvent $event): ?JobSeekerUpsell
    {
        $upsell = JobSeekerUpsell::query()
            ->where('reference', $event->reference)
            ->lockForUpdate()
            ->first();

        if (! $upsell) {
            return null;
        }

        if ($upsell->status->isFinal()) {
            return $upsell;
        }

        // The signature proves the notification is Paystack's. It does not prove
        // the amount is what we asked for, so the price is re-checked here
        // against the catalogue before anything is marked paid.
        if ($event->status === PaymentStatus::Succeeded
            && ($event->amount !== $upsell->getAmount()
                || ($event->currency !== null && strtoupper($event->currency) !== strtoupper($upsell->getCurrency())))) {
            Log::error('Upsell webhook amount or currency did not match; purchase not settled.', [
                'upsell_id' => $upsell->id,
                'expected' => $upsell->getAmount().' '.$upsell->getCurrency(),
                'received' => $event->amount.' '.$event->currency,
            ]);

            $upsell->update([
                'status' => $event->status,
                'error' => 'Amount or currency did not match the purchase.',
            ]);

            return $upsell->fresh();
        }

        $upsell->update([
            'status' => $event->status,
            'paid_at' => $event->status === PaymentStatus::Succeeded ? now() : null,
            'error' => null,
        ]);

        if ($event->status === PaymentStatus::Succeeded) {
            $this->grant($upsell->fresh());
        }

        return $upsell->fresh();
    }

    /**
     * What the buyer actually receives. One product today, so this is a
     * notification and a record rather than an entitlement check consulted
     * elsewhere — but it is the single place that says "they paid", so adding
     * the second product means editing here and nowhere else.
     */
    protected function grant(JobSeekerUpsell $upsell): void
    {
        $product = UpsellCatalogue::find($upsell->sku);

        if (! $product) {
            Log::warning('Settled upsell references a product that is no longer in the catalogue.', [
                'upsell_id' => $upsell->id,
                'sku' => $upsell->sku,
            ]);

            return;
        }

        $application = $upsell->application()->with('job:id,title')->first();
        $seeker = $upsell->user;

        if ($seeker instanceof User) {
            Notifier::send($seeker, [
                'category' => 'billing',
                'type' => 'success',
                'icon' => 'bi-stars',
                'text' => $product['name'].' is booked. We will be in touch to arrange your session for '.($application?->job?->title ?? 'your role').'.',
                'action' => 'View application',
                'link' => '/seeker/applications/'.$upsell->application_id,
                'subject' => $product['name'].' confirmed',
            ]);
        }
    }

    /**
     * Everything a seeker has bought, for the application they are looking at.
     *
     * @return array<int, array<string, mixed>>
     */
    public function catalogueFor(Application $application): array
    {
        $owned = JobSeekerUpsell::query()
            ->where('application_id', $application->id)
            ->get()
            ->keyBy('sku');

        $rows = [];

        foreach (UpsellCatalogue::availableFor($application) as $item) {
            $rows[] = ['purchased' => false] + $item;
        }

        // Products that were offered and bought: still listed, so the buyer can
        // see what they have rather than the option simply vanishing.
        foreach ($owned as $sku => $upsell) {
            if (collect($rows)->contains('sku', $sku)) {
                continue;
            }

            $product = UpsellCatalogue::find($sku);

            if (! $product) {
                continue;
            }

            $rows[] = ['purchased' => $upsell->isSettled()] + ['sku' => $sku] + $product;
        }

        return $rows;
    }

    /**
     * Reference shape: a stable prefix plus randomness, so a reference is
     * recognisable in a support conversation and cannot be guessed.
     */
    protected function generateReference(): string
    {
        return 'ups_'.Str::lower(Str::random(16));
    }
}
