<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\Request;

class ActivityLog extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'actor_name',
        'action',
        'target_type',
        'target_id',
        'target_name',
        'level',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function target(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Record an auditable action for the given actor.
     *
     * Centralised so every mutating endpoint logs the same shape instead of
     * hand-rolling the payload (and forgetting a field) at each call site.
     */
    public static function record(
        ?User $actor,
        string $action,
        ?Model $target = null,
        string $level = 'info',
        ?Request $request = null,
    ): self {
        $request ??= request();

        return static::create([
            'user_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'System',
            'action' => $action,
            'target_type' => $target ? $target::class : null,
            'target_id' => $target?->getKey(),
            'target_name' => $target?->name ?? $target?->title,
            'level' => $level,
            'ip_address' => $request?->ip(),
            'user_agent' => substr((string) $request?->userAgent(), 0, 255),
            'created_at' => now(),
        ]);
    }
}
