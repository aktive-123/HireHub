<?php

namespace App\Models;

use App\Enums\HiringFeeLevel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HiringFeeRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'level',
        'category_id',
        'flat_amount',
        'currency',
        'percentage_override',
        'use_greater_of',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'level' => HiringFeeLevel::class,
            'flat_amount' => 'integer',
            'percentage_override' => 'integer',
            'use_greater_of' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Fees this rate has priced. The admin console reads it to decide whether a
     * rate may be deleted, so it is deliberately a live count rather than a
     * cached figure that could go stale.
     */
    public function hiringFees(): HasMany
    {
        return $this->hasMany(HiringFee::class);
    }

    /**
     * The rule read as a percentage, or null when this rate is flat only.
     */
    public function percentage(): ?float
    {
        return $this->percentage_override === null
            ? null
            : round($this->percentage_override / 100, 4);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
