<?php

namespace App\Models;

use App\Enums\EmploymentType;
use App\Enums\JobStatus;
use App\Enums\WorkplaceType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Job extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id',
        'category_id',
        'user_id',
        'title',
        'slug',
        'location',
        'workplace',
        'employment_type',
        'level',
        'tags',
        'salary_min',
        'salary_max',
        'salary_currency',
        'salary_period',
        'description',
        'responsibilities',
        'requirements',
        'benefits',
        'is_featured',
        'is_verified',
        'status',
        'view_count',
        'applications_count',
        'posted_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'responsibilities' => 'array',
            'requirements' => 'array',
            'benefits' => 'array',
            'salary_min' => 'float',
            'salary_max' => 'float',
            'is_featured' => 'boolean',
            'is_verified' => 'boolean',
            'workplace' => WorkplaceType::class,
            'employment_type' => EmploymentType::class,
            'status' => JobStatus::class,
            'posted_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
