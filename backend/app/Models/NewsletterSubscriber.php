<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NewsletterSubscriber extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_UNSUBSCRIBED = 'unsubscribed';

    protected $fillable = [
        'email',
        'status',
        'confirmation_token',
        'confirmed_at',
        'unsubscribe_token',
        'unsubscribed_at',
        'source',
    ];

    protected $hidden = [
        'confirmation_token',
        'unsubscribe_token',
    ];

    protected function casts(): array
    {
        return [
            'confirmed_at' => 'datetime',
            'unsubscribed_at' => 'datetime',
        ];
    }

    /** Emails are compared case-insensitively, so normalise on the way in. */
    public static function normaliseEmail(string $email): string
    {
        return Str::lower(trim($email));
    }

    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_CONFIRMED);
    }

    /**
     * Put an address back into the confirmation flow: a fresh confirmation
     * token, a cleared confirmation timestamp, and the pending status. Used for
     * a first signup, a resend of a lapsed link, and re-subscribing after an
     * opt-out.
     */
    public function beginConfirmation(): void
    {
        $this->forceFill([
            'status' => self::STATUS_PENDING,
            'confirmation_token' => Str::random(64),
            'confirmed_at' => null,
            'unsubscribed_at' => null,
            // Only minted once, then kept for the life of the record: the
            // unsubscribe link in an already-delivered email has to keep
            // working, so regenerating it here would break past sends.
            'unsubscribe_token' => $this->unsubscribe_token ?: Str::random(64),
        ])->save();
    }

    public function confirm(): void
    {
        $this->forceFill([
            'status' => self::STATUS_CONFIRMED,
            'confirmed_at' => now(),
            // A spent confirmation token is never needed again.
            'confirmation_token' => null,
        ])->save();
    }

    public function unsubscribe(): void
    {
        $this->forceFill([
            'status' => self::STATUS_UNSUBSCRIBED,
            'unsubscribed_at' => now(),
        ])->save();
    }
}
