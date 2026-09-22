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
        ]);
    }
}
