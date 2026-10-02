<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Payments\PaymentManager;
use App\Payments\PaymentService;
use App\Services\Upsell\UpsellService;
use Illuminate\Http\Request;

class WebhookController extends ApiController
{
    public function __construct(
        protected PaymentManager $manager,
        protected PaymentService $payments,
        protected UpsellService $upsells,
    ) {}

    /**
     * Receive a provider notification.
     *
     * Unauthenticated by design — the provider has no HireHub token — so the
     * gateway's HMAC signature is the entire authentication story. The gateway
     * is taken from the route and never from the body, so a signature that is
     * valid for one provider cannot be replayed against another's endpoint.
     */
    public function handle(Request $request, string $gateway)
    {
        if (! $this->manager->isAvailable($gateway)) {
            return $this->error('Unknown payment gateway.', 404);
        }

        $event = $this->manager->driver($gateway)->verifyWebhook($request);

        if (! $event) {
            // Either the signature did not verify, or this is a validly signed
            // notification for an event we do not act on. Deliberately
            // indistinguishable in the response: saying which one it was would
            // tell an unauthenticated caller how far their forgery got.
            return $this->error('Invalid or unrecognised webhook.', 401);
        }

        // Two kinds of money share this one provider endpoint, so the
        // subscription/hiring-fee service is offered the event first and the
        // upsell service is only asked if it did not recognise the reference.
        $payment = $this->payments->apply($event);

        $upsell = $payment ? null : $this->upsells->apply($event);

        return $this->success(
            ['applied' => ($payment !== null || $upsell !== null)],
            ($payment || $upsell) ? 'Webhook processed.' : 'Webhook received.'
        );
    }
}
