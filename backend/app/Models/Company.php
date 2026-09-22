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
        'is_featured',
        'is_verified',
        'tagline',
        'description',
        'status',
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

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
