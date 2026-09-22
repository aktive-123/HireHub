<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $companies = [
            [
                'slug' => 'google', 'name' => 'Google', 'contact' => 'David Okafor',
                'logo_text' => 'G', 'logo_bg' => '#ffffff', 'logo_color' => '#4285f4',
                'industry' => 'Technology', 'location' => 'Lagos, Nigeria', 'size' => '10,000+ Employees',
                'founded' => 1998, 'website' => 'https://google.com', 'rating' => 4.5, 'reviews_count' => 1240,
                'open_jobs_count' => 6, 'is_featured' => true, 'is_verified' => true,
                'tagline' => 'Organize the world’s information and make it universally accessible and useful.',
                'description' => 'Google builds products that help billions of people connect, explore and get things done. Our Nigeria office focuses on Android, Cloud and machine-learning tools that serve Africa and the world.',
            ],
            [
                'slug' => 'microsoft', 'name' => 'Microsoft', 'contact' => 'Grace Adeyemi',
                'logo_text' => 'M', 'logo_bg' => '#f8fafc', 'logo_color' => '#00a4ef',
                'industry' => 'Technology', 'location' => 'Abuja, Nigeria', 'size' => '221,000+ Employees',
                'founded' => 1975, 'website' => 'https://microsoft.com', 'rating' => 4.6, 'reviews_count' => 980,
                'open_jobs_count' => 6, 'is_featured' => true, 'is_verified' => true,
                'tagline' => 'Empower every person and every organization on the planet to achieve more.',
                'description' => 'Microsoft is a global leader in software, services, devices and solutions. We help individuals and businesses across Africa build for the future with cloud, AI and productivity tools.',
            ],
            [
                'slug' => 'flutterwave', 'name' => 'Flutterwave', 'contact' => 'Samuel Adeleke',
                'logo_text' => 'F', 'logo_bg' => '#fff7ed', 'logo_color' => '#f97316',
                'industry' => 'Fintech', 'location' => 'Lagos, Nigeria', 'size' => '1,001–5,000 Employees',
                'founded' => 2016, 'website' => 'https://flutterwave.com', 'rating' => 4.5, 'reviews_count' => 410,
                'open_jobs_count' => 8, 'is_featured' => true, 'is_verified' => true,
                'tagline' => 'Build anything, get paid anywhere in Africa.',
                'description' => 'Flutterwave is the leading payments technology company on the continent. We make it simple for businesses to send and receive money across borders through one API.',
            ],
            [
                'slug' => 'dangote', 'name' => 'Dangote', 'contact' => 'Amina Yusuf',
                'logo_text' => 'D', 'logo_bg' => '#f0fdf4', 'logo_color' => '#15803d',
                'industry' => 'Conglomerate', 'location' => 'Abuja, Nigeria', 'size' => '10,000+ Employees',
                'founded' => 1981, 'website' => 'https://dangote.com', 'rating' => 4.2, 'reviews_count' => 230,
                'open_jobs_count' => 12, 'is_featured' => false, 'is_verified' => true,
                'tagline' => 'Making African resources work for Africa.',
                'description' => 'Dangote is one of Africa’s largest diversified business groups, active in cement, sugar, flour, petrochemicals and more. We are committed to self-sufficiency and local value creation.',
            ],
            [
                'slug' => 'paystack', 'name' => 'Paystack', 'contact' => 'Chinedu Okeke',
                'logo_text' => 'P', 'logo_bg' => '#f0f9ff', 'logo_color' => '#0080e5',
                'industry' => 'Fintech', 'location' => 'Lagos, Nigeria', 'size' => '201–500 Employees',
                'founded' => 2015, 'website' => 'https://paystack.com', 'rating' => 4.7, 'reviews_count' => 540,
                'open_jobs_count' => 8, 'is_featured' => true, 'is_verified' => true,
                'tagline' => 'Modern online and offline payments for Africa.',
                'description' => 'Paystack helps businesses accept payments online and offline in minutes. We are building the definitive payments infrastructure for the African internet economy.',
            ],
            [
                'slug' => 'andela', 'name' => 'Andela', 'contact' => 'Bola Ajayi',
                'logo_text' => 'A', 'logo_bg' => '#fdf2f8', 'logo_color' => '#db2777',
                'industry' => 'Technology', 'location' => 'Lagos, Nigeria (Remote)', 'size' => '1,001–5,000 Employees',
                'founded' => 2014, 'website' => 'https://andela.com', 'rating' => 4.4, 'reviews_count' => 620,
                'open_jobs_count' => 8, 'is_featured' => true, 'is_verified' => true,
                'tagline' => 'Unlock the world’s potential through technology.',
                'description' => 'Andela matches brilliant software engineers with global companies and invests in building the next generation of technology leaders across Africa and beyond.',
            ],
            [
                'slug' => 'interswitch', 'name' => 'Interswitch', 'contact' => 'Nneka Uche',
                'logo_text' => 'I', 'logo_bg' => '#f8fafc', 'logo_color' => '#2563eb',
                'industry' => 'Fintech', 'location' => 'Lagos, Nigeria', 'size' => '1,001–5,000 Employees',
                'founded' => 2002, 'website' => 'https://interswitchgroup.com', 'rating' => 4.1, 'reviews_count' => 310,
                'open_jobs_count' => 5, 'is_featured' => false, 'is_verified' => true,
                'tagline' => 'Digital payment platforms that move Africa forward.',
                'description' => 'Interswitch builds and runs payments and switching infrastructure that powers digital commerce and banking across Africa.',
            ],
            [
                'slug' => 'sterling-bank', 'name' => 'Sterling Bank', 'contact' => 'Tunde Salami',
                'logo_text' => 'S', 'logo_bg' => '#fefce8', 'logo_color' => '#ca8a04',
                'industry' => 'Banking & Finance', 'location' => 'Lagos, Nigeria', 'size' => '1,001–5,000 Employees',
                'founded' => 1960, 'website' => 'https://sterling.ng', 'rating' => 4.0, 'reviews_count' => 180,
                'open_jobs_count' => 7, 'is_featured' => false, 'is_verified' => true,
                'tagline' => 'Banking that works for the new age.',
                'description' => 'Sterling Bank is a full-service national commercial bank delivering modern digital banking and tailored financial solutions across Nigeria.',
            ],
        ];

        foreach ($companies as $index => $company) {
            $user = User::updateOrCreate(['email' => "hr@{$company['slug']}.com"], [
                'name' => $company['contact'],
                'role' => UserRole::Employer,
                'status' => AccountStatus::Active,
                'password' => 'password',
                'email_verified_at' => now(),
            ]);

            unset($company['contact']);
            Company::updateOrCreate(['slug' => $company['slug']], $company + [
                'user_id' => $user->id,
                'status' => 'active',
            ]);
        }
    }
}
