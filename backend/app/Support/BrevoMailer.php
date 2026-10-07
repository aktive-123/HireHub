<?php

namespace App\Support;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use UnexpectedValueException;

/**
 * Transactional mail over Brevo's HTTPS API, with the configured Laravel
 * mailer as a fallback.
 *
 * Why API first — the same reasoning Otp::deliver() documents, applied to
 * every other message the platform sends: one transport, one credential. When
 * SMTP credentials drift on production, only the flows still on the mailer
 * notice, and they notice by silently not arriving. The API path needs only
 * BREVO_API_KEY, which is the key already keeping signup and reset codes
 * flowing, so a new mail type inherits a proven transport instead of
 * re-discovering whether the relay is healthy.
 *
 * The fallback exists for environments with no key — local development and
 * the test suite, where the mailer is faked or intentionally absent — so
 * those keep working without a secret.
 *
 * Deliberately separate from Otp::deliverViaBrevoApi rather than refactored
 * into it: OTP delivery is the most load-bearing mail in the application and
 * is not to be touched as a side effect of adding another sender. If a third
 * call site appears, extract then.
 */
final class BrevoMailer
{
    /**
     * Deliver a mailable now. Returns void; a throw means neither transport
     * delivered, and the caller decides whether that fails the operation or
     * is reported as a best-effort flag.
     *
     * @throws \Throwable
     */
    public static function send(Mailable $mail, string $email, ?string $name = null): void
    {
        $apiKey = config('services.brevo.api_key');

        if (is_string($apiKey) && trim($apiKey) !== '') {
            self::sendViaApi($mail, $apiKey, $email, $name);

            return;
        }

        Mail::to($email)->send($mail);
    }

    /**
     * POST the rendered mailable to Brevo's SMTP API. Mirrors the OTP call:
     * short timeouts so a hanging provider surfaces as a failure the caller
     * can report, and the same `api-key` header scheme.
     */
    private static function sendViaApi(Mailable $mail, string $apiKey, string $email, ?string $name): void
    {
        $senderEmail = (string) config('mail.from.address');

        if ($senderEmail === '') {
            throw new UnexpectedValueException('MAIL_FROM_ADDRESS is not configured.');
        }

        $sender = ['email' => $senderEmail];
        $senderName = (string) config('mail.from.name');
        if ($senderName !== '') {
            $sender['name'] = $senderName;
        }

        $recipient = ['email' => $email];
        if (is_string($name) && $name !== '') {
            $recipient['name'] = $name;
        }

        $envelope = $mail->envelope();

        $payload = [
            'sender' => $sender,
            'to' => [$recipient],
            'subject' => (string) ($envelope->subject ?? ''),
            'htmlContent' => $mail->render(),
        ];

        // A plain-text part when the mailable defines one: links have to
        // survive clients and gateways that strip or mangle HTML, and an
        // invitation with no clickable, copyable link is useless.
        if (method_exists($mail, 'renderText')) {
            $text = $mail->renderText();
            if (is_string($text) && $text !== '') {
                $payload['textContent'] = $text;
            }
        }

        try {
            $response = Http::acceptJson()
                ->withHeaders(['api-key' => $apiKey])
                ->connectTimeout(5)
                ->timeout(15)
                ->post('https://api.brevo.com/v3/smtp/email', $payload);
        } catch (ConnectionException $e) {
            throw new UnexpectedValueException(
                'Brevo API connection failed: '.$e->getMessage(),
                previous: $e,
            );
        }

        if (! $response->successful()) {
            // Provider wording only — it never contains the key or the
            // configured SMTP credentials, both of which would be poison in
            // a log line.
            $providerMessage = $response->json('message');
            $details = is_string($providerMessage) && $providerMessage !== ''
                ? ': '.$providerMessage
                : '';

            throw new UnexpectedValueException(
                sprintf('Brevo API returned HTTP %d%s.', $response->status(), $details),
            );
        }
    }
}
