<?php

namespace Database\Factories;

use App\Models\Interview;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Interview>
 */
class InterviewFactory extends Factory
{
    public function definition(): array
    {
        return [
            'scheduled_at' => now()->addDays(3),
            'duration_minutes' => 30,
            'mode' => 'video',
            'link' => 'https://meet.example.com/x',
            'notes' => fake()->sentence(),
            'status' => 'scheduled',
        ];
    }
}
