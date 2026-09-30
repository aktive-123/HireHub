<?php

namespace App\Support;

/**
 * Outcome of a one-time password check.
 *
 * Exists so the controller can give a signed-in user a precise reason — "that
 * code expired, request a new one" is actionable, whereas a generic failure
 * sends them round in circles. The anonymous paths deliberately collapse these
 * into one message so the distinctions cannot be used to probe for accounts.
 */
final readonly class OtpVerificationResult
{
    private function __construct(
        public bool $ok,
        public string $reason,
        public ?int $attemptsRemaining = null,
    ) {}

    public static function valid(?object $record = null): self
    {
        return new self(true, 'verified', null);
    }

    public static function invalid(): self
    {
        return new self(false, 'invalid');
    }

    public static function expired(): self
    {
        return new self(false, 'expired');
    }

    public static function tooManyAttempts(): self
    {
        return new self(false, 'too_many_attempts');
    }

    public function isValid(): bool
    {
        return $this->ok;
    }
}
