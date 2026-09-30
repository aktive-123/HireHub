<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CategorySeeder::class,
            AdminSeeder::class,
            CompanySeeder::class,
            JobSeeder::class,
            SeekerSeeder::class,
            ApplicationSeeder::class,
            ActivityLogSeeder::class,
            SettingSeeder::class,
            PlanSeeder::class,
            // Rates before fees: a seeded fee records which rate priced it, so
            // the tier has to exist first.
            HiringFeeRateSeeder::class,
            HiringFeeSeeder::class,
        ]);
    }
}
