<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\Job;
use App\Models\User;
use Illuminate\Database\Seeder;

class ActivityLogSeeder extends Seeder
{
    public function run(): void
    {
        $logs = [
            ['actor' => 'David Okafor', 'action' => 'published a new job', 'target_name' => 'Senior Frontend Developer', 'level' => 'success'],
            ['actor' => 'Sarah Bello', 'action' => 'suspended the account of', 'target_name' => 'Ngozi Eze', 'level' => 'danger'],
            ['actor' => 'Ada Obi', 'action' => 'submitted an application for', 'target_name' => 'Senior Frontend Developer', 'level' => 'info'],
            ['actor' => 'System', 'action' => 'flagged a job posting', 'target_name' => 'Crypto Growth Hacker', 'level' => 'warning'],
            ['actor' => 'Grace Adeyemi', 'action' => 'verified the company profile for', 'target_name' => 'Flutterwave', 'level' => 'success'],
            ['actor' => 'Sarah Bello', 'action' => 'updated platform settings', 'target_name' => 'Moderation rules', 'level' => 'info'],
            ['actor' => 'Tunde Bakare', 'action' => 'created an account as', 'target_name' => 'Job Seeker', 'level' => 'info'],
            ['actor' => 'Chinedu Okeke', 'action' => 'posted a job', 'target_name' => 'Backend Developer', 'level' => 'success'],
            ['actor' => 'System', 'action' => 'expired a job listing', 'target_name' => 'Junior Data Analyst', 'level' => 'warning'],
            ['actor' => 'Sarah Bello', 'action' => 'removed a skill', 'target_name' => 'jQuery', 'level' => 'danger'],
            ['actor' => 'Amina Yusuf', 'action' => 'shortlisted a candidate', 'target_name' => 'Ada Obi', 'level' => 'success'],
            ['actor' => 'Nneka Uche', 'action' => 'invited a teammate to', 'target_name' => 'Google', 'level' => 'info'],
        ];

        foreach (array_reverse($logs) as $minutes => $log) {
            $user = User::where('name', $log['actor'])->first();
            $company = Company::where('name', $log['target_name'])->first();
            $job = Job::where('title', $log['target_name'])->first();

            ActivityLog::create([
                'user_id' => $user?->id,
                'actor_name' => $log['actor'],
                'action' => $log['action'],
                'target_type' => $company ? Company::class : ($job ? Job::class : null),
                'target_id' => $company?->id ?? $job?->id,
                'target_name' => $log['target_name'],
                'level' => $log['level'],
                'created_at' => now()->subMinutes(($minutes + 1) * 13),
            ]);
        }
    }
}
