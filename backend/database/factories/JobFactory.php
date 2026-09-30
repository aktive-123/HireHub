<?php

namespace Database\Factories;

use App\Models\Job;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Job>
 */
class JobFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->unique()->jobTitle();

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(6)),
            'location' => fake()->city(),
            'workplace' => 'on-site',
            'employment_type' => 'full-time',
            'level' => 'mid',
            'tags' => ['React', 'CSS'],
            'salary_min' => 40000,
            'salary_max' => 80000,
            'salary_currency' => 'USD',
            'salary_period' => 'year',
            'description' => fake()->paragraph(),
            'responsibilities' => ['Build features'],
            'requirements' => ['3+ years experience'],
            'benefits' => ['Health cover'],
            'is_featured' => false,
            'is_verified' => false,
            'status' => 'open',
            'view_count' => 0,
            'applications_count' => 0,
            'posted_at' => now(),
            'expires_at' => now()->addDays(60),
        ];
    }
}
