<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // Plans first: the subscription seeder prices and limits from the
            // plan table, and the job seeder reads each company's featured-slot
            // allowance before deciding what it may feature. Both used to run
            // after the jobs, which is how featured jobs came to exceed the
            // free tier's zero-slot allowance.
            PlanSeeder::class,
            CategorySeeder::class,
            AdminSeeder::class,
            CompanySeeder::class,
            SubscriptionSeeder::class,
            JobSeeder::class,
            SeekerSeeder::class,
            ApplicationSeeder::class,
            ActivityLogSeeder::class,
            SettingSeeder::class,
            // Rates before fees: a seeded fee records which rate priced it, so
            // the tier has to exist first.
            HiringFeeRateSeeder::class,
            HiringFeeSeeder::class,
        ]);
    }
}
