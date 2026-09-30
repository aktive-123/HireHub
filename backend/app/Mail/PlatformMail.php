<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PlatformMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public array $payload) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->payload['subject'] ?? $this->payload['text'] ?? 'HireHub notification',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.platform',
            with: [
                'payload' => $this->payload,
            ],
        );
    }
}
