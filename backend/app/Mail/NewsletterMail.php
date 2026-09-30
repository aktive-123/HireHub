<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

class NewsletterMail extends Mailable
{
    use Queueable, SerializesModels;

    public const KIND_CONFIRMATION = 'confirmation';

    public const KIND_UNSUBSCRIBE = 'unsubscribe';

    /**
     * @param  string  $kind  self::KIND_*
     * @param  string  $actionUrl  absolute URL for the button in the email
     */
    public function __construct(
        public string $kind,
        public string $actionUrl,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->kind === self::KIND_CONFIRMATION
            ? 'Confirm your HireHub newsletter subscription'
            : 'Confirm you want to stop the HireHub newsletter';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.newsletter',
            with: [
                'kind' => $this->kind,
                'actionUrl' => $this->actionUrl,
            ],
        );
    }

    /**
     * Mail clients that support the header strip the subscribe link in one
     * click without opening the site. Sending it on every message is what
     * keeps deliverability healthy for a bulk sender.
     *
     * Must return a Headers object, not a plain array: Mailable hydrates this
     * by reading ->messageId/->text/->references off the return value.
     */
    public function headers(): Headers
    {
        if ($this->kind !== self::KIND_UNSUBSCRIBE) {
            return new Headers;
        }

        return new Headers(
            text: ['List-Unsubscribe' => '<'.$this->actionUrl.'>'],
        );
    }
}
