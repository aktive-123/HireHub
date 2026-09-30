<?php

namespace Database\Factories;

use App\Models\Application;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'status' => 'new',
            'match_score' => fake()->numberBetween(0, 100),
            'cover_letter' => fake()->paragraph(),
            'applied_at' => now(),
        ];
    }
}
