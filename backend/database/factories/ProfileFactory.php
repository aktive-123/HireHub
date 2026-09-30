<?php

namespace Database\Factories;

use App\Models\Profile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Profile>
 */
class ProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'headline' => fake()->jobTitle(),
            'location' => fake()->city(),
            'summary' => fake()->paragraph(),
            'years_experience' => (string) fake()->numberBetween(1, 12),
            'notice_period' => '30 days',
            'skills' => ['React', 'JavaScript', 'CSS'],
            'certifications' => ['AWS Certified'],
            'portfolio' => ['https://example.com'],
        ];
    }
}
