<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\Job;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ApplicationSeeder extends Seeder
{
    public function run(): void
    {
        $applications = [
            ['seeker' => 'ada.obi@mail.com', 'job' => 'Senior Frontend Developer', 'match' => 92, 'status' => 'shortlisted', 'applied' => '12 Sep'],
            ['seeker' => 'tunde.bakare@mail.com', 'job' => 'Full-Stack Developer', 'match' => 88, 'status' => 'new', 'applied' => '11 Sep'],
            ['seeker' => 'chidinma.nwosu@mail.com', 'job' => 'Backend Developer', 'match' => 85, 'status' => 'interview', 'applied' => '10 Sep'],
            ['seeker' => 'ibrahim.musa@mail.com', 'job' => 'DevOps Engineer', 'match' => 79, 'status' => 'new', 'applied' => '09 Sep'],
            ['seeker' => 'fatima.sani@mail.com', 'job' => 'Data Analyst', 'match' => 76, 'status' => 'hired', 'applied' => '08 Sep'],
            ['seeker' => 'emeka.okafor@mail.com', 'job' => 'Product Designer', 'match' => 74, 'status' => 'rejected', 'applied' => '07 Sep'],
            ['seeker' => 'ngozi.eze@mail.com', 'job' => 'QA Engineer', 'match' => 69, 'status' => 'new', 'applied' => '06 Sep'],
            ['seeker' => 'yusuf.adeyemi@mail.com', 'job' => 'Platform Engineer', 'match' => 82, 'status' => 'shortlisted', 'applied' => '05 Sep'],
            ['seeker' => 'aisha.bello@mail.com', 'job' => 'Project Manager', 'match' => 71, 'status' => 'interview', 'applied' => '04 Sep'],
            ['seeker' => 'tobi.alabi@mail.com', 'job' => 'Senior Frontend Developer', 'match' => 90, 'status' => 'hired', 'applied' => '03 Sep'],
        ];

        foreach ($applications as $application) {
            $seeker = User::where('email', $application['seeker'])->first();
            $job = Job::where('title', $application['job'])->first();
            if (! $seeker || ! $job) {
                continue;
            }

            $appliedAt = Carbon::createFromFormat('d M', $application['applied'])
                ->setYear(now()->year);

            if ($appliedAt->isFuture()) {
                $appliedAt = $appliedAt->subYear();
            }

            Application::updateOrCreate(
                ['job_id' => $job->id, 'seeker_id' => $seeker->id],
                [
                    'status' => $application['status'],
                    'match_score' => $application['match'],
                    'applied_at' => $appliedAt,
                ]
            );
        }
    }
}
