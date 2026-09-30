<?php

namespace Database\Factories;

use App\Models\SavedJob;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavedJob>
 */
class SavedJobFactory extends Factory
{
    public function definition(): array
    {
        return [
            'saved_at' => now(),
        ];
    }
}
