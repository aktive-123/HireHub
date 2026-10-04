<?php

namespace App\Mail;

use App\Models\OtpCode;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Carries a one-time password.
 *
 * Sent inline by the OTP service: queueing would leave short-lived codes
 * stranded when the host has no worker. Transport failures are handled by
 * Otp::deliverSafely so signup can report a delivery failure cleanly.
 */
class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $code,
        public readonly string $purpose,
        public readonly ?string $recipientName,
        public readonly int $expiresInMinutes,
        public readonly string $appName,
        public readonly string $supportUrl,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->purpose === OtpCode::PURPOSE_RESET
            ? sprintf('%s — your password reset code', $this->appName)
            : sprintf('%s — verify your email address', $this->appName);

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            // HTML rather than markdown: the brief calls for a branded email
            // with the logo and the brand colour, and markdown templates are
            // deliberately layout-free. A `text` alternative is registered
            // alongside so a client that blocks remote images still shows the
            // code in plain text.
            html: 'mail.otp',
            text: 'mail.otp-text',
            with: [
                'code' => $this->code,
                'purpose' => $this->purpose,
                'recipientName' => $this->recipientName,
                'expiresInMinutes' => $this->expiresInMinutes,
                'appName' => $this->appName,
                'supportUrl' => $this->supportUrl,
                'logoUrl' => $this->logoUrl(),
                'isReset' => $this->purpose === OtpCode::PURPOSE_RESET,
                'heading' => $this->purpose === OtpCode::PURPOSE_RESET
                    ? 'Reset your password'
                    : 'Verify your email address',
                'intro' => $this->purpose === OtpCode::PURPOSE_RESET
                    ? 'Use the code below to choose a new HireHub password. It only works for the account linked to this address.'
                    : 'Enter this code to finish creating your HireHub account.',
            ],
        );
    }

    public function renderText(): string
    {
        $content = $this->content();

        if (! is_string($content->text) || $content->text === '') {
            return '';
        }

        return view($content->text, $content->with)->render();
    }

    /**
     * Absolute URL of the brand logo, so mail clients that strip relative
     * paths still render it. Falls back to an empty string, in which case the
     * template shows the wordmark as text instead of a broken image.
     */
    private function logoUrl(): string
    {
        // `mail.logo_url`, not a hand-built path: the site root has no
        // `/logo.png`, so a name guessed here resolves to a 404 and the email
        // shows a broken image where the logo should be.
        return (string) config('mail.logo_url');
    }

    /**
     * No attachments, and nothing here should ever carry an attachment.
     */
    public function attachments(): array
    {
        return [];
    }
}
