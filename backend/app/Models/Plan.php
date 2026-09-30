<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'tagline',
        'price',
        'currency',
        'billing_period',
        'job_post_limit',
        'featured_job_limit',
        'cv_view_limit',
        'is_featured',
        'features',
        'entitlements',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'features' => 'array',
            'entitlements' => 'array',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'job_post_limit' => 'integer',
            'featured_job_limit' => 'integer',
            'cv_view_limit' => 'integer',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function isFree(): bool
    {
        return $this->price === 0;
    }

    /**
     * Convert minor units to a major-unit decimal string for display only.
     * Never use this for arithmetic or for what the gateway is charged.
     */
    public function formattedPrice(): string
    {
        $major = $this->price / 100;

        return number_format($major, 2).' '.$this->currency;
    }
}
