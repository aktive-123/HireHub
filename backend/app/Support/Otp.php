<?php

namespace App\Support;

use App\Mail\OtpMail;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use UnexpectedValueException;

/**
 * Issues, mails and verifies six-digit one-time passwords.
 *
 * Lives in Support rather than in a controller because two flows need it and
 * the rules are subtle enough that duplicating them in two places would let
 * the two drift — one flow ending up single-use while the other is not.
 *
 * Guarantees, in order of how badly they would hurt if broken:
 *
 *  - The code is never persisted in plaintext. Only an HMAC-SHA256 is stored.
 *  - A code is single use. Redemption sets `consumed_at` inside the same
 *    transaction that checks it, with the row locked, so two concurrent
 *    redemptions cannot both win.
 *  - A code expires. Ten minutes, checked server side; the client countdown is
 *    a convenience, never the control.
 *  - Repeated wrong guesses burn the code, so the million-value keyspace is
 *    not brute-forceable inside one window.
 *  - Issuing is rate limited per (purpose, email, IP) and per IP, and a new
 *    code invalidates the previous one for that address and purpose.
 */
class Otp
{
    public static function purposeVerify(): string
    {
        return OtpCode::PURPOSE_VERIFY;
    }

    public static function purposeReset(): string
    {
        return OtpCode::PURPOSE_RESET;
    }

    public function ttlMinutes(): int
    {
        return (int) config('otp.ttl_minutes', 10);
    }

    public function resendCooldownSeconds(): int
    {
        return (int) config('otp.resend_cooldown_seconds', 60);
    }

    /**
     * HMAC-SHA256 of a code, keyed with OTP_HMAC_KEY.
     *
     * A bare sha256 would be reversible here: the keyspace is only a million
     * values, so anyone with a database dump could hash all of them in
     * milliseconds. The HMAC key never leaves the server, which makes the
     * stored value useless on its own.
     */
    public function hash(string $code): string
    {
        return hash_hmac('sha256', $code, $this->signingKey());
    }

    /**
     * The signing key, falling back to the application key.
     *
     * OTP_HMAC_KEY is a separate variable so the key can be rotated without
     * invalidating the framework key (and therefore without decrypting every
     * session cookie). Falling back to APP_KEY keeps a fresh checkout working
     * rather than failing closed with a confusing null-hmac error.
     */
    private function signingKey(): string
    {
        $key = config('otp.hmac_key') ?: config('app.key');

        if (! is_string($key) || $key === '') {
            throw new RuntimeException(
                'No OTP signing key available. Set OTP_HMAC_KEY, or APP_KEY via `php artisan key:generate`.'
            );
        }

        return $key;
    }

    /**
     * Rate limit key for issuing, scoped to one purpose and one address.
     *
     * Deliberately not keyed by user id: at sign-up there is no user yet, and
     * for password reset the whole point is to answer identically for addresses
     * that do and do not exist.
     */
    private function issueKey(string $purpose, string $email, ?string $ip): string
    {
        return 'otp:issue:'.$purpose.':'.Str::lower($email).':'.($ip ?? 'unknown');
    }

    /**
     * How many issues remain in the current window, for a 429 message that can
     * tell the user how long to wait.
     */
    public function issueAttemptsRemaining(string $purpose, string $email, ?string $ip): int
    {
        $max = (int) config('otp.rate_limit_max_attempts', 3);
        $decay = (int) config('otp.rate_limit_decay_minutes', 15) * 60;

        $used = RateLimiter::attempts($this->issueKey($purpose, $email, $ip));

        return max(0, $max - $used);
    }

    public function retryAfterSeconds(string $purpose, string $email, ?string $ip): int
    {
        return RateLimiter::availableIn($this->issueKey($purpose, $email, $ip));
    }

    /**
     * Generate, store and mail a code.
     *
     * Returns the plaintext so a caller that must surface it directly (there
     * is no such caller in production) can. When mail is disabled the code is
     * logged instead, which is what makes the flow testable and developable
     * without an SMTP account.
     *
     * @throws RuntimeException when the rate limit or the resend cooldown bites
     */
    public function issue(
        string $email,
        string $purpose,
        ?User $user = null,
        ?string $ip = null,
        ?string $name = null,
    ): string {
        $email = Str::lower(trim($email));
        $decay = (int) config('otp.rate_limit_decay_minutes', 15) * 60;

        if (RateLimiter::tooManyAttempts($this->issueKey($purpose, $email, $ip), (int) config('otp.rate_limit_max_attempts', 3))) {
            throw new RuntimeException('rate_limited:'.$this->retryAfterSeconds($purpose, $email, $ip));
        }

        if ($wait = $this->cooldownRemaining($email, $purpose)) {
            throw new RuntimeException('cooldown:'.$wait);
        }

        $code = $this->generateCode();

        DB::transaction(function () use ($code, $email, $purpose, $user, $ip): void {
            // A new code supersedes the old one, so an earlier email can never
            // be redeemed after the user has asked for a fresh code.
            OtpCode::query()
                ->where('email', $email)
                ->where('purpose', $purpose)
                ->delete();

            OtpCode::create([
                'user_id' => $user?->id,
                'email' => $email,
                'purpose' => $purpose,
                'code_hash' => $this->hash($code),
                'expires_at' => now()->addMinutes($this->ttlMinutes()),
                'ip_address' => $ip,
            ]);
        });

        // Counted after the write succeeds, so a failed attempt does not burn
        // the user's quota for a code they never received.
        RateLimiter::hit($this->issueKey($purpose, $email, $ip), $decay);

        Log::channel('stderr')->info('HireHub OTP generated.', [
            'event' => 'otp.generated',
            'purpose' => $purpose,
        ]);

        $this->deliverSafely($code, $email, $purpose, $name ?? $user?->name);

        return $code;
    }

    /**
     * Seconds until this address may request another code, 0 when it may.
     */
    public function cooldownRemaining(string $email, string $purpose): int
    {
        $last = OtpCode::query()
            ->where('email', Str::lower(trim($email)))
            ->where('purpose', $purpose)
            ->latest('id')
            ->first();

        if (! $last) {
            return 0;
        }

        // The remaining wait is the deadline minus now, so the difference has to
        // be taken in that direction and signed: `deadline->diffInSeconds(now())`
        // is negative for the whole of the cooldown and positive only once it has
        // already expired, which reads as "no cooldown" while the user is still
        // inside the window and as "one more second" afterwards.
        $deadline = $last->created_at->copy()->addSeconds($this->resendCooldownSeconds());

        return max(0, (int) ceil(now()->diffInSeconds($deadline, false)));
    }

    /**
     * Result of a verification attempt.
     *
     * A small value object rather than a bool so the caller can tell "wrong
     * code" from "expired" from "no such code" for the *authenticated* cases
     * without those distinctions leaking through the anonymous ones.
     */
    public function verify(string $email, string $purpose, string $code, ?User $user = null): OtpVerificationResult
    {
        $email = Str::lower(trim($email));

        return DB::transaction(function () use ($email, $purpose, $code, $user): OtpVerificationResult {
            $record = OtpCode::query()
                ->where('email', $email)
                ->where('purpose', $purpose)
                // Only consider the newest code, so a superseded one is dead
                // even if its row somehow survived.
                ->latest('id')
                ->lockForUpdate()
                ->first();

            // One answer for "no code", "already used" and "wrong address" — the
            // difference between them is an enumeration oracle.
            if (! $record || $record->isConsumed() || ($user && $record->user_id !== $user->id)) {
                return OtpVerificationResult::invalid();
            }

            if ($record->isExpired()) {
                // Burn it, so an expired code is not merely ignored but gone.
                $record->forceFill(['consumed_at' => now()])->save();

                return OtpVerificationResult::expired();
            }

            if (! hash_equals($record->code_hash, $this->hash(trim($code)))) {
                $record->forceFill(['attempts' => $record->attempts + 1])->save();

                if ($record->attempts + 1 >= (int) config('otp.max_code_attempts', 5)) {
                    $record->forceFill(['consumed_at' => now()])->save();

                    return OtpVerificationResult::tooManyAttempts();
                }

                return OtpVerificationResult::invalid();
            }

            $record->forceFill(['consumed_at' => now()])->save();

            return OtpVerificationResult::valid($record);
        });
    }

    /**
     * Six cryptographically random digits.
     *
     * random_int is used rather than rand/mt_rand: this value is a credential,
     * and a predictable PRNG seed would make every code guessable.
     */
    private function generateCode(): string
    {
        $length = (int) config('otp.length', 6);
        $max = (int) (10 ** $length) - 1;

        return str_pad((string) random_int(0, $max), $length, '0', STR_PAD_LEFT);
    }

    /**
     * Deliver a code, converting a transport failure into something the callers
     * already know how to handle.
     *
     * A gateway that rejects the send — an unverified sender domain, an expired
     * key, a provider outage — otherwise throws a `TransportException` straight
     * out of the register and login endpoints, so a person whose password is
     * correct gets a 500 instead of a page. Both callers already handle a
     * `RuntimeException`: registration rolls the account back and shows the
     * `delivery_failed` wording, and login answers with the same
     * verification-required body it sends on every other failure, which is
     * also what keeps the response identical for a registered and an
     * unregistered address.
     *
     * The row is deleted on the way out. A code nobody received is useless, and
     * leaving it behind would start the resend cooldown on a code that can
     * never arrive, locking the user out of the one fix that would help.
     */
    private function deliverSafely(string $code, string $email, string $purpose, ?string $name): void
    {
        try {
            $this->deliver($code, $email, $purpose, $name);
        } catch (TransportExceptionInterface|ConnectionException|UnexpectedValueException $e) {
            OtpCode::query()
                ->where('email', $email)
                ->where('purpose', $purpose)
                ->delete();

            $context = [
                'event' => 'otp.mail.failed',
                'purpose' => $purpose,
                'failure_type' => $e::class,
                'failure_message' => $this->safeFailureMessage($e->getMessage()),
            ];

            Log::channel('stderr')->error('HireHub OTP mail delivery failed.', $context);
            Log::channel('otp-codes')->error('HireHub OTP mail delivery failed.', $context);

            throw new RuntimeException('delivery_failed');
        }
    }

    public function deliver(string $code, string $email, string $purpose, ?string $name): void
    {
        $mail = new OtpMail(
            code: $code,
            purpose: $purpose,
            recipientName: $name,
            expiresInMinutes: $this->ttlMinutes(),
            appName: (string) config('app.name'),
            supportUrl: FrontendUrl::to('/contact'),
        );

        if (! config('mail.enabled', false)) {
            Log::channel('stderr')->warning('HireHub OTP mail is disabled.', [
                'event' => 'otp.mail.disabled',
                'purpose' => $purpose,
            ]);

            // Local development and the test suite run without an SMTP account.
            // Writing to a dedicated channel keeps the flow exercisable end to
            // end instead of forcing everyone to stand up a mail catcher before
            // they can complete a signup.
            Log::channel('otp-codes')->notice(sprintf(
                'HireHub OTP [%s] for %s: %s (expires in %d minutes)',
                $purpose,
                $email,
                $code,
                $this->ttlMinutes()
            ));

            return;
        }

        if ($purpose === OtpCode::PURPOSE_RESET) {
            $this->deliverPasswordResetViaBrevoApi($mail, $email, $name);
            $transport = 'brevo_api';
        } else {
            // OTPs expire quickly. Send them in this request so delivery does not
            // depend on a separate queue worker being provisioned by the host.
            Mail::to($email)->send($mail);
            $transport = (string) config('mail.default');
        }

        Log::channel('stderr')->info('HireHub OTP accepted by the mail transport.', [
            'event' => 'otp.mail.accepted',
            'purpose' => $purpose,
            'transport' => $transport,
        ]);
    }

    private function deliverPasswordResetViaBrevoApi(OtpMail $mail, string $email, ?string $name): void
    {
        $apiKey = config('services.brevo.api_key');

        if (! is_string($apiKey) || trim($apiKey) === '') {
            throw new UnexpectedValueException('BREVO_API_KEY is not configured.');
        }

        $senderEmail = (string) config('mail.from.address');
        $senderName = (string) config('mail.from.name');

        if ($senderEmail === '') {
            throw new UnexpectedValueException('MAIL_FROM_ADDRESS is not configured.');
        }

        $sender = ['email' => $senderEmail];
        if ($senderName !== '') {
            $sender['name'] = $senderName;
        }

        $recipient = ['email' => $email];
        if ($name !== null && $name !== '') {
            $recipient['name'] = $name;
        }

        $envelope = $mail->envelope();
        $content = $mail->content();

        try {
            $response = Http::acceptJson()
                ->withHeaders(['api-key' => $apiKey])
                ->connectTimeout(5)
                ->timeout(15)
                ->post('https://api.brevo.com/v3/smtp/email', [
                    'sender' => $sender,
                    'to' => [$recipient],
                    'subject' => $envelope->subject ?? 'HireHub password reset code',
                    'htmlContent' => $mail->render(),
                    'textContent' => $mail->renderText(),
                ]);
        } catch (ConnectionException $e) {
            throw new UnexpectedValueException('Brevo API connection failed: '.$e->getMessage(), previous: $e);
        }

        if (! $response->successful()) {
            $providerCode = $response->json('code');
            $providerMessage = $response->json('message');
            $details = [];

            if (is_string($providerCode) && $providerCode !== '') {
                $details[] = $providerCode;
            }

            if (is_string($providerMessage) && $providerMessage !== '') {
                $details[] = $providerMessage;
            }

            throw new UnexpectedValueException(sprintf(
                'Brevo API returned HTTP %d%s.',
                $response->status(),
                $details === [] ? '' : ': '.implode(' - ', $details),
            ));
        }
    }

    private function safeFailureMessage(string $message): string
    {
        $sensitiveValues = [
            config('mail.mailers.smtp.password'),
            config('mail.mailers.smtp.username'),
            config('mail.mailers.smtp.url'),
            config('services.brevo.api_key'),
            config('mail.mailers.mailgun.secret'),
            config('services.resend.key'),
            config('services.postmark.key'),
            config('services.ses.secret'),
            config('otp.hmac_key'),
            config('app.key'),
        ];

        foreach ($sensitiveValues as $value) {
            if (is_string($value) && $value !== '') {
                $message = str_replace($value, '[redacted]', $message);
            }
        }

        $patterns = [
            '~\\b(?:smtps?)://[^\\s/@]+@~i' => '[redacted-smtp-url]',
            '~((?:password|passwd|secret|api[_ -]?key|token)\\s*[:=]\\s*)[^\\s,;]+~i' => '$1[redacted]',
            '/\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b/i' => '[redacted-email]',
            '/(?<!\\d)\\d{6}(?!\\d)/' => '[redacted-code]',
            '/(?<![A-Za-z0-9])[A-Za-z0-9_-]{32,}(?![A-Za-z0-9])/' => '[redacted-token]',
        ];

        foreach ($patterns as $pattern => $replacement) {
            $message = preg_replace($pattern, $replacement, $message) ?? $message;
        }

        $message = preg_replace('/[\r\n\t]+/', ' ', $message) ?? $message;

        return substr(trim($message), 0, 1000);
    }
}
