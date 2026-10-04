<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Profile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'headline',
        'location',
        'address_line',
        'city',
        'state',
        'summary',
        'years_experience',
        'notice_period',
        'skills',
        'certifications',
        'portfolio',
        'cv_path',
        'cv_name',
        'cv_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'skills' => 'array',
            'certifications' => 'array',
            'portfolio' => 'array',
            'cv_updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function experiences(): HasMany
    {
        return $this->hasMany(Experience::class)->orderBy('sort_order');
    }

    public function educations(): HasMany
    {
        return $this->hasMany(Education::class)->orderBy('sort_order');
    }
}
