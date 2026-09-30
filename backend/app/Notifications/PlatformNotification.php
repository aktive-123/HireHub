<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PlatformNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array{category: string, text: string, action: string|null, link: string|null, type: string|int}|array  $payload
     */
    public function __construct(public array $payload) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return $this->payload;
    }

    public function toArray(object $notifiable): array
    {
        return $this->payload;
    }
}
