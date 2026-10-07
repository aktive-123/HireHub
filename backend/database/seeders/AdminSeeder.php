<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $password = $this->resolvePassword();

        if ($password === null) {
            return;
        }

        $admins = [
            [
                'name' => 'HireHub Admin',
                'email' => 'hirehub87@gmail.com',
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
                'password' => $password,
                'email_verified_at' => now(),
            ]);
        }
    }

    /**
     * An admin account with a password that is published in the repository is a
     * ready-made backdoor, so the credential is never hardcoded:
     *
     *  - local/staging  falls back to a documented development password
     *  - production     requires ADMIN_SEED_PASSWORD, and skips seeding
     *                   entirely when it is absent rather than inventing one
     */
    private function resolvePassword(): ?string
    {
        $configured = env('ADMIN_SEED_PASSWORD');

        if (is_string($configured) && $configured !== '') {
            return Hash::make($configured);
        }

        if (app()->environment('production')) {
            $this->command?->warn('ADMIN_SEED_PASSWORD is not set — skipping admin seeding.');

            return null;
        }

        $generated = 'password';

        $this->command?->info("Seeded dev admins with the password '{$generated}'.");

        return Hash::make($generated);
    }
}
