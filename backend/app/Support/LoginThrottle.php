<?php

namespace App\Support;

use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;

/**
 * Brute-force protection for credential endpoints.
 *
 * Three independent counters are kept because each one alone is trivially
 * defeated:
 *
 *  - per (email + IP) — the normal case, stops one host grinding one account
 *  - per IP          — stops a single host spraying many accounts
 *  - per email       — stops a botnet spraying one account from many hosts
 *
 * All three use the same decay window so a legitimate user only has to wait
 * out one period, and a successful login clears them.
 */
final class LoginThrottle
{
    private function __construct(
        private readonly RateLimiter $limiter,
        private readonly int $maxAttempts,
        private readonly int $decaySeconds,
    ) {}

    public static function make(): self
    {
        return new self(
            app(RateLimiter::class),
            (int) config('security.lockout_attempts'),
            (int) config('security.lockout_decay'),
        );
    }

    /**
     * @return array<string, int> remaining attempts per active counter
     */
    public function keys(Request $request, ?string $email): array
    {
        return array_filter([
            'pair' => $this->pairKey($request, $email),
            'ip' => 'login-ip:'.$request->ip(),
            'email' => $email ? 'login-email:'.self::fingerprint($email) : null,
        ], fn ($key) => $key !== null);
    }

    public function tooManyAttempts(Request $request, ?string $email): bool
    {
        foreach ($this->keys($request, $email) as $key) {
            if ($this->limiter->tooManyAttempts($key, $this->maxAttempts)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Seconds until the earliest active counter frees up, so the 429 can tell
     * the client exactly how long to wait instead of guessing.
     */
    public function availableIn(Request $request, ?string $email): int
    {
        $waits = [];

        foreach ($this->keys($request, $email) as $key) {
            if ($this->limiter->tooManyAttempts($key, $this->maxAttempts)) {
                $waits[] = $this->limiter->availableIn($key);
            }
        }

        return $waits === [] ? 0 : (int) min($waits);
    }

    public function hit(Request $request, ?string $email): void
    {
        foreach ($this->keys($request, $email) as $key) {
            $this->limiter->hit($key, $this->decaySeconds);
        }
    }

    public function clear(Request $request, ?string $email): void
    {
        foreach ($this->keys($request, $email) as $key) {
            $this->limiter->clear($key);
        }
    }

    /**
     * Hashing the email keeps account addresses out of the cache keys, where
     * they would otherwise sit in plain text in Redis and any cache dump.
     */
    private function pairKey(Request $request, ?string $email): string
    {
        return 'login-pair:'.self::fingerprint(strtolower((string) $email).'|'.$request->ip());
    }

    private static function fingerprint(string $value): string
    {
        return hash('sha256', mb_strtolower(trim($value)));
    }
}
