<?php

namespace App\Mail;

use App\Support\FrontendUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The emailed half of an admin invitation: a single-use link, not a
 * credential.
 *
 * Same reasoning as PasswordResetByAdminMail, one step further removed: the
 * message never contains a password or a token that works forever. What it
 * carries is a URL whose token expires in a week and dies the moment it is
 * used, so a copy of this mail lying in an inbox — or in a relay's log — is
 * worth nothing once spent or expired, and can be revoked in the console
 * before then.
 *
 * Delivered in-request rather than queued, like every other mail here: the
 * production container supervises no queue worker, so a queued message would
 * sit in the jobs table forever while the console claimed it was sent.
 */
class AdminInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        /** The invited address; we do not know the person's name yet. */
        public readonly string $recipientLabel,
        /** The administrator who issued the invitation, shown for context. */
        public readonly string $inviterName,
        /** Absolute URL to the accept screen, carrying the one-time token. */
        public readonly string $inviteUrl,
        /** Human-readable expiry, e.g. "Oct 14, 2026 at 6:31 PM". */
        public readonly string $expiresLabel,
        public readonly string $appName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: sprintf('%s — you have been invited to the admin console', $this->appName),
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'mail.admin-invite',
            // A plain-text alternative for clients that will not render the
            // branded part. The invite link is the whole point of this
            // message, so it has to survive whatever the client does to HTML.
            text: 'mail.admin-invite-text',
            with: [
                'recipientLabel' => $this->recipientLabel,
                'inviterName' => $this->inviterName,
                'inviteUrl' => $this->inviteUrl,
                'expiresLabel' => $this->expiresLabel,
                'appName' => $this->appName,
                'supportUrl' => FrontendUrl::to('/contact'),
                // `mail.logo_url`, not a hand-built path: the site root has no
                // `/logo.png`, so a name guessed here renders as a broken image
                // exactly where the logo should be.
                'logoUrl' => (string) config('mail.logo_url'),
            ],
        );
    }

    /**
     * Render the text part for transports that take it explicitly (the Brevo
     * API sender). Same shape as OtpMail::renderText for the same reason: the
     * invite link is this message's entire purpose, so it has to survive
     * whatever the client does to the HTML.
     */
    public function renderText(): string
    {
        $content = $this->content();

        if (! is_string($content->text) || $content->text === '') {
            return '';
        }

        return view($content->text, $content->with)->render();
    }
}
