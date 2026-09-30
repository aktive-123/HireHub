<?php

namespace App\Support;

use App\Mail\PlatformMail;
use App\Models\User;
use App\Notifications\PlatformNotification;
use Illuminate\Support\Facades\Mail;

class Notifier
{
    /**
     * Deliver a notification to a user via the database, and by email when
     * the user has an address and email delivery is not disabled.
     *
     * @param  array<string, mixed>  $payload  category, text, action, link, type, icon, subject
     */
    public static function send(?User $user, array $payload, bool $email = true): void
    {
        if (! $user) {
            return;
        }

        $user->notify(new PlatformNotification($payload));

        if ($email && $user->email && config('mail.enabled', true)) {
            try {
                Mail::to($user->email)->queue(new PlatformMail($payload));
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }
}
