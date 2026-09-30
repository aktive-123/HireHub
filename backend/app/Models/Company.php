<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * `status`, `is_verified` and `is_featured` are moderation flags, not user
     * editable profile data. Leaving them fillable means a single careless
     * `fill($request->all())` would let an employer verify their own company,
     * so they are only ever assigned explicitly by admin and seeding code.
     */
    protected $fillable = [
        'user_id',
        'slug',
        'name',
        'industry',
        'location',
        'size',
        'founded',
        'website',
        'rating',
        'reviews_count',
        'open_jobs_count',
        'logo_text',
        'logo_bg',
        'logo_color',
        'tagline',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'float',
            'is_featured' => 'boolean',
            'is_verified' => 'boolean',
            'founded' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class);
    }

    /**
     * Placement fees this company has been charged. The admin revenue
     * breakdown groups by company, so this is the relation behind it.
     */
    public function hiringFees(): HasMany
    {
        return $this->hasMany(HiringFee::class);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
