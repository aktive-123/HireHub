<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'slug' => Str::slug(fake()->unique()->word().Str::random(4)),
            'name' => fake()->unique()->words(2, true),
            'icon' => 'bi-briefcase',
            'description' => fake()->sentence(),
            'sort_order' => 0,
            'status' => 'active',
        ];
    }
}
