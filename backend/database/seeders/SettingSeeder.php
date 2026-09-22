<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'general' => [
                'site_name' => 'HireHub',
                'support_email' => 'support@hirehub.com',
                'notify_admin_new_seeker' => true,
                'notify_admin_new_employer' => true,
            ],
            'brand' => [
                'primary_color' => '#0054ec',
                'secondary_color' => '#0b1f3a',
                'accent_color' => '#f59e0b',
            ],
            'moderation' => [
                'require_job_approval' => false,
                'auto_verify_companies' => true,
            ],
            'analytics' => [
                'tracking_enabled' => false,
                'public_job_views' => true,
            ],
            'notifications' => [
                'seeker_digest_enabled' => true,
                'employer_daily_summary' => true,
                'maintenance_banner' => false,
            ],
        ];

        foreach ($settings as $group => $values) {
            foreach ($values as $key => $value) {
                Setting::updateOrCreate(
                    ['group' => $group, 'key' => $key],
                    ['value' => $value]
                );
            }
        }
    }
}
