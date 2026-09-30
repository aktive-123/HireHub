<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'slug' => fn (array $attributes) => Str::slug($attributes['name']).'-'.Str::lower(Str::random(6)),
            'industry' => fake()->randomElement(['Technology', 'Finance', 'Healthcare', 'Education']),
            'location' => fake()->city().', '.fake()->country(),
            'size' => fake()->randomElement(['1-10', '11-50', '51-200', '201-500']),
            'website' => 'https://'.Str::slug(fake()->company()).'.example.com',
            'status' => 'active',
            'is_verified' => false,
        ];
    }
}
