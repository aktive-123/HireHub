<?php

namespace App\Payments;

use App\Enums\PaymentGateway;
use App\Payments\Contracts\PaymentGateway as PaymentGatewayContract;
use App\Payments\Gateways\FlutterwaveGateway;
use App\Payments\Gateways\PaystackGateway;
use App\Payments\Gateways\StripeGateway;
use InvalidArgumentException;

class PaymentManager
{
    /** @var array<string, class-string<PaymentGatewayContract>> */
    protected array $drivers = [
        PaymentGateway::Paystack->value => PaystackGateway::class,
        PaymentGateway::Flutterwave->value => FlutterwaveGateway::class,
        PaymentGateway::Stripe->value => StripeGateway::class,
    ];

    public function driver(?string $name = null): PaymentGatewayContract
    {
        $name = $name ?: (string) config('payments.default');

        if (! isset($this->drivers[$name])) {
            throw new InvalidArgumentException("Unsupported payment gateway [{$name}].");
        }

        return app($this->drivers[$name]);
    }

    public function isAvailable(string $name): bool
    {
        return isset($this->drivers[$name]) && $this->driver($name)->isConfigured();
    }

    /**
     * Gateways the employer may actually pay through right now, default first.
     * Unconfigured ones are omitted so checkout never offers a dead option.
     *
     * @return array<int, string>
     */
    public function available(): array
    {
        $available = array_values(array_filter(
            array_keys($this->drivers),
            fn (string $name): bool => $this->isAvailable($name)
        ));

        // Default first, but only if it is actually configured.
        $default = (string) config('payments.default');
        $front = array_values(array_filter([$default], fn (string $name): bool => in_array($name, $available, true)));

        return array_merge($front, array_values(array_diff($available, $front)));
    }

    /**
     * @return array<int, array{name: string, label: string}>
     */
    public function availableWithLabels(): array
    {
        return array_map(
            fn (string $name): array => [
                'name' => $name,
                'label' => PaymentGateway::from($name)->label(),
            ],
            $this->available()
        );
    }
}
