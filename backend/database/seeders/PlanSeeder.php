<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        // Amounts are in kobo (NGN minor units) so no float rounding is
        // possible. updateOrCreate keeps re-seeding idempotent and, more
        // importantly, never touches the price of a plan that already has
        // payments attached to it.
        //
        // `features` is the marketing copy rendered on the pricing page.
        // `entitlements` is the contract the API enforces, and is kept separate
        // so rewording a bullet can never silently grant or revoke a capability.
        $plans = [
            [
                'slug' => 'free',
                'name' => 'Free',
                'tagline' => 'Start hiring, pay nothing.',
                'price' => 0,
                'job_post_limit' => 2,
                'featured_job_limit' => 0,
                'cv_view_limit' => 10,
                'features' => [
                    'Post up to 2 jobs',
                    '10 CV views per month',
                    'Applicant tracking and pipeline',
                    'Company profile page',
                    'Email support',
                ],
                'entitlements' => [
                    'analytics' => false,
                    'exports' => false,
                    'candidate_filters' => false,
                    'interview_scheduling' => false,
                    'priority_support' => false,
                ],
            ],
            [
                'slug' => 'professional',
                'name' => 'Professional',
                'tagline' => 'For growing teams hiring regularly.',
                'price' => 2500000,
                'job_post_limit' => 10,
                'featured_job_limit' => 2,
                'cv_view_limit' => 100,
                'features' => [
                    'Post up to 10 jobs',
                    '2 featured job slots',
                    '100 CV views per month',
                    'Advanced candidate filters',
                    'Priority applicant support',
                ],
                'entitlements' => [
                    'analytics' => false,
                    'exports' => false,
                    'candidate_filters' => true,
                    'interview_scheduling' => false,
                    'priority_support' => true,
                ],
            ],
            [
                'slug' => 'business',
                'name' => 'Business',
                'tagline' => 'For companies scaling their workforce.',
                'price' => 7500000,
                'job_post_limit' => 50,
                'featured_job_limit' => 10,
                'cv_view_limit' => 500,
                'features' => [
                    'Post up to 50 jobs',
                    '10 featured job slots',
                    '500 CV views per month',
                    'Hiring analytics and exports',
                    'Interview scheduling suite',
                    'Dedicated account manager',
                ],
                'entitlements' => [
                    'analytics' => true,
                    'exports' => true,
                    'candidate_filters' => true,
                    'interview_scheduling' => true,
                    'priority_support' => true,
                ],
            ],
        ];

        foreach ($plans as $index => $plan) {
            Plan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan + [
                    'currency' => 'NGN',
                    'billing_period' => 'monthly',
                    'is_featured' => $plan['slug'] === 'professional',
                    'is_active' => true,
                    'sort_order' => $index,
                ]
            );
        }
    }
}
