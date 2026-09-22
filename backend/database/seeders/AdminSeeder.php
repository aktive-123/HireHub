<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admins = [
            [
                'name' => 'Sarah Bello',
                'email' => 'sarah.admin@hirehub.com',
                'role' => UserRole::Admin,
                'status' => AccountStatus::Active,
            ],
            [
                'name' => 'Platform Bot',
                'email' => 'system@hirehub.com',
                'role' => UserRole::Admin,
                'status' => AccountStatus::Active,
            ],
        ];

        foreach ($admins as $admin) {
            User::updateOrCreate(['email' => $admin['email']], [
                'name' => $admin['name'],
                'role' => $admin['role'],
                'status' => $admin['status'],
                'password' => 'password',
                'email_verified_at' => now(),
            ]);
        }
    }
}
