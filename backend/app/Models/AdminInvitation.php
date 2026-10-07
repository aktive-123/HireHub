<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single-use, expiring grant to create an admin account.
 *
 * The row never holds the credential itself — only the sha256 of the token
 * that went out by email — so possession of the emailed link is what proves
 * the invitation, and the database proves nothing on its own.
 */
class AdminInvitation extends Model
{
    /** Days an unaccepted link stays live before it stops working. */
    public const TTL_DAYS = 7;

    protected $fillable = [
        'email',
        'token_hash',
        'invited_by',
        'expires_at',
        'accepted_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * Outstanding invitations: not yet claimed and still inside their window.
     * Expired rows are kept (an admin should see that an invite lapsed) but
     * excluded from this listing, which is about what can still be used.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('accepted_at')->where('expires_at', '>', now());
    }

    /** True while the token from the link still opens the accept screen. */
    public function isUsable(): bool
    {
        return $this->accepted_at === null && $this->expires_at->isFuture();
    }

    /**
     * A fresh raw token for the emailed link: 32 random bytes as hex, 64
     * characters of unguessable material. The caller stores only its hash.
     */
    public static function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Resolve a raw token from a link to its row, or null if there is none.
     *
     * Shape is checked before hashing so a nonsense path segment cannot turn
     * into a database round trip — and a non-match stays a non-match rather
     * than an error, because the endpoint answers identically for unknown,
     * expired and already-used tokens.
     */
    public static function findByToken(string $token): ?self
    {
        if (! preg_match('/^[a-f0-9]{64}$/', $token)) {
            return null;
        }

        return static::where('token_hash', hash('sha256', $token))->first();
    }
}
