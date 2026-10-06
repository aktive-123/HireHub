<?php

namespace App\Mail;

use App\Support\FrontendUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Tells an account holder that an administrator reset their password.
 *
 * The message carries a link and never a credential. That is the whole design
 * decision: a password emailed in plaintext is a permanent copy in somebody's
 * mailbox, in a backup of that mailbox, and in every mail-relay log between
 * here and there — none of which the platform can revoke. A link can be
 * expired, and the recipient sets the password themselves rather than being
 * handed one.
 *
 * The temporary password still exists, because an admin who has reset somebody's
 * password usually needs a way to let them in immediately and the mail may not
 * arrive. It is shown once in the console, to the admin, and the account cannot
 * do anything until it is replaced.
 */
class PasswordResetByAdminMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $recipientName,
        public readonly string $adminName,
        public readonly string $resetUrl,
        public readonly string $appName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: sprintf('%s — your password was reset', $this->appName));
    }

    public function content(): Content
    {
        return new Content(
            html: 'mail.password-reset-by-admin',
            // A plain-text alternative for clients that will not render the
            // branded part. The reset link is the whole point of this message,
            // so it must survive whatever the client does to the HTML.
            text: 'mail.password-reset-by-admin-text',
            with: [
                'recipientName' => $this->recipientName,
                'adminName' => $this->adminName,
                'resetUrl' => $this->resetUrl,
                'appName' => $this->appName,
                'supportUrl' => FrontendUrl::to('/contact'),
                // `mail.logo_url`, not a hand-built path: the site root has no
                // `/logo.png`, so a name guessed here renders as a broken image
                // exactly where the logo should be.
                'logoUrl' => (string) config('mail.logo_url'),
            ],
        );
    }
}
