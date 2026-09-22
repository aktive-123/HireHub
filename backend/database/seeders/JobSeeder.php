<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use Illuminate\Database\Seeder;

class JobSeeder extends Seeder
{
    public function run(): void
    {
        $jobs = [
            [
                'company' => 'Google', 'category' => 'Technology', 'title' => 'Senior Frontend Developer',
                'slug' => 'senior-frontend-developer', 'location' => 'Lagos, Nigeria', 'workplace' => 'remote',
                'employment_type' => 'full-time', 'level' => 'Senior', 'tags' => ['React', 'TypeScript', 'CSS'],
                'salary_min' => 80000, 'salary_max' => 120000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 2, 'status' => 'open', 'is_featured' => true, 'is_verified' => true,
                'view_count' => 1240, 'applications_count' => 58,
                'description' => 'We are looking for a Senior Frontend Developer to join our product team building fast, accessible web experiences used by millions. You will own features from design handoff through production, mentor junior engineers, and help define our component architecture.',
                'responsibilities' => [
                    'Build and ship accessible, performant UI with React and modern tooling',
                    'Collaborate closely with designers to translate Figma specs into polished interfaces',
                    'Own the component library and ensure consistent, maintainable styling',
                    'Mentor mid-level and junior developers through reviews and pairing',
                    'Champion performance, accessibility and test coverage across the frontend',
                ],
                'requirements' => [
                    '5+ years of professional frontend experience with React',
                    'Strong command of modern JavaScript (ES2021+) and TypeScript',
                    'Deep understanding of responsive design and cross-browser behavior',
                    'Experience with state management and REST/GraphQL API integration',
                    'Excellent written communication and a collaborative mindset',
                ],
                'benefits' => [
                    'Competitive salary + equity',
                    'Health, dental and vision coverage',
                    'Remote-first with annual team retreats',
                    'Learning budget and conference allowance',
                ],
            ],
            [
                'company' => 'Microsoft', 'category' => 'Technology', 'title' => 'Backend Developer',
                'slug' => 'backend-developer', 'location' => 'Abuja, Nigeria', 'workplace' => 'on-site',
                'employment_type' => 'full-time', 'level' => 'Senior', 'tags' => ['PHP', 'Laravel', 'MySQL'],
                'salary_min' => 70000, 'salary_max' => 100000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 3, 'status' => 'open', 'is_featured' => true, 'is_verified' => true,
                'view_count' => 980, 'applications_count' => 41,
                'description' => 'Join our platform engineering team and help design robust, secure APIs that power core products. You will work across the stack with a focus on reliability, security and developer experience.',
                'responsibilities' => [
                    'Design and build RESTful APIs with secure, well-structured code',
                    'Write clean, tested code following best practices for security',
                    'Optimize database queries and model relationships for scale',
                    'Participate in architecture reviews and on-call rotation',
                ],
                'requirements' => [
                    '4+ years of backend development experience',
                    'Professional experience with PHP and a modern framework',
                    'Solid understanding of relational databases and indexing',
                    'Experience with authentication and secure API design',
                    'Strong debugging and problem-solving skills',
                ],
                'benefits' => [
                    'Hybrid work options',
                    'Annual performance bonus',
                    'Wellness and education stipends',
                    'Modern equipment and tech budget',
                ],
            ],
            [
                'company' => 'Flutterwave', 'category' => 'Design', 'title' => 'UI/UX Designer',
                'slug' => 'ui-ux-designer', 'location' => 'Lagos, Nigeria', 'workplace' => 'remote',
                'employment_type' => 'contract', 'level' => 'Mid Level', 'tags' => ['Figma', 'Prototyping', 'Design Systems'],
                'salary_min' => 40000, 'salary_max' => 70000, 'salary_currency' => 'USD', 'salary_period' => 'month',
                'posted_days_ago' => 5, 'status' => 'open', 'is_featured' => true, 'is_verified' => true,
                'view_count' => 740, 'applications_count' => 27,
                'description' => 'We are reimagining how businesses accept payments and need a designer who can turn complex flows into elegant, intuitive interfaces. You will own design work end-to-end and partner directly with product and engineering.',
                'responsibilities' => [
                    'Design user flows, wireframes, and high-fidelity mockups',
                    'Build and evolve a scalable design system',
                    'Run usability sessions and iterate on feedback',
                    'Hand off precise specs to engineers and review builds',
                ],
                'requirements' => [
                    '3+ years designing digital products',
                    'Expert proficiency in Figma',
                    'Portfolio demonstrating strong visual and UX craft',
                    'Comfort giving and receiving constructive feedback',
                ],
                'benefits' => [
                    'Contract with renewal opportunity',
                    'Flexible working hours',
                    'Work from anywhere globally',
                    'Professional development credit',
                ],
            ],
            [
                'company' => 'Dangote', 'category' => 'Marketing', 'title' => 'Marketing Specialist',
                'slug' => 'marketing-specialist', 'location' => 'Abuja, Nigeria', 'workplace' => 'on-site',
                'employment_type' => 'full-time', 'level' => 'Mid Level', 'tags' => ['SEO', 'Content', 'Analytics'],
                'salary_min' => 50000, 'salary_max' => 75000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 6, 'status' => 'open', 'is_featured' => true, 'is_verified' => true,
                'view_count' => 610, 'applications_count' => 33,
                'description' => 'Support our growth marketing team in driving brand awareness and qualified pipeline. You will plan campaigns, craft content, and measure impact with clear reporting.',
                'responsibilities' => [
                    'Plan and execute multi-channel marketing campaigns',
                    'Write and edit content for web, email and social',
                    'Track performance and report on key metrics',
                    'Coordinate with design and sales teams',
                ],
                'requirements' => [
                    '2+ years in marketing or content roles',
                    'Strong writing and editing ability',
                    'Familiarity with analytics and campaign tools',
                    'Organized and detail-oriented',
                ],
                'benefits' => [
                    'Competitive salary',
                    'Health cover',
                    'Career growth paths',
                    'Employee discounts',
                ],
            ],
            [
                'company' => 'Paystack', 'category' => 'Technology', 'title' => 'Data Analyst',
                'slug' => 'data-analyst', 'location' => 'Lagos, Nigeria', 'workplace' => 'on-site',
                'employment_type' => 'full-time', 'level' => 'Entry Level', 'tags' => ['SQL', 'Excel', 'Tableau'],
                'salary_min' => 42000, 'salary_max' => 60000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 1, 'status' => 'open', 'is_featured' => true, 'is_verified' => true,
                'view_count' => 380, 'applications_count' => 19,
                'description' => 'An exciting opportunity to turn data into decisions. You will build dashboards, run analyses and partner with product teams to surface insights that drive growth.',
                'responsibilities' => [
                    'Clean, transform and analyze business data',
                    'Build and maintain dashboards and reports',
                    'Answer ad-hoc questions with clear, timely analysis',
                    'Document data processes and definitions',
                ],
                'requirements' => [
                    '0-2 years of analytics experience or strong academic record',
                    'Working knowledge of SQL',
                    'Strong Excel and data visualization skills',
                    'Curious, analytical and detail-oriented',
                ],
                'benefits' => [
                    'Mentorship and growth tracks',
                    'Flexible schedules',
                    'Health insurance',
                    'Quarterly team events',
                ],
            ],
            [
                'company' => 'Andela', 'category' => 'Design', 'title' => 'Product Designer',
                'slug' => 'product-designer', 'location' => 'Lagos, Nigeria', 'workplace' => 'hybrid',
                'employment_type' => 'full-time', 'level' => 'Senior', 'tags' => ['Product Strategy', 'UX', 'User Research'],
                'salary_min' => 95000, 'salary_max' => 130000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 4, 'status' => 'closed', 'is_featured' => false, 'is_verified' => true,
                'view_count' => 720, 'applications_count' => 24,
                'description' => 'Lead design across an entire product line, from research and strategy through final polished UI. You will be the voice of the user and partner closely with product and engineering leadership.',
                'responsibilities' => [
                    'Lead discovery and user research',
                    'Define product strategy alongside PM and eng',
                    'Deliver end-to-end design across multiple surfaces',
                    'Mentor designers and elevate craft',
                ],
                'requirements' => [
                    '6+ years of product design experience',
                    'Track record shipping complex products',
                    'Strong systems thinking and presentation skills',
                    'Experience leading research',
                ],
                'benefits' => [
                    'Competitive compensation',
                    'Remote-first culture',
                    'Health and wellness budget',
                    'Annual learning allowance',
                ],
            ],
            [
                'company' => 'Google', 'category' => 'Technology', 'title' => 'Security Engineer',
                'slug' => 'security-engineer', 'location' => 'Lagos, Nigeria', 'workplace' => 'remote',
                'employment_type' => 'full-time', 'level' => 'Senior', 'tags' => ['Security', 'DevSecOps', 'Coding'],
                'salary_min' => 110000, 'salary_max' => 150000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 7, 'status' => 'open', 'is_featured' => false, 'is_verified' => true,
                'view_count' => 560, 'applications_count' => 15,
                'description' => 'Protect our products and users by embedding security into the development lifecycle. You will review code, build security tooling, and help teams ship safely.',
                'responsibilities' => [
                    'Conduct security reviews of applications and infrastructure',
                    'Build and maintain security tooling and automation',
                    'Respond to and investigate security incidents',
                    'Train developers on secure practices',
                ],
                'requirements' => [
                    '5+ years security engineering experience',
                    'Strong software engineering background',
                    'Experience with cloud security and IAM',
                    'Knowledge of OWASP Top 10 and threat modeling',
                ],
                'benefits' => [
                    'Top-of-market pay',
                    'Comprehensive benefits',
                    'Remote-first',
                    'Security conference budget',
                ],
            ],
            [
                'company' => 'Flutterwave', 'category' => 'Support', 'title' => 'Customer Support Specialist',
                'slug' => 'customer-support-specialist', 'location' => 'Abuja, Nigeria', 'workplace' => 'on-site',
                'employment_type' => 'full-time', 'level' => 'Entry Level', 'tags' => ['CRM', 'Communication', 'Zendesk'],
                'salary_min' => 30000, 'salary_max' => 45000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 8, 'status' => 'closed', 'is_featured' => false, 'is_verified' => true,
                'view_count' => 340, 'applications_count' => 22,
                'description' => 'Be the friendly, reliable first line of support for businesses using our product. You will resolve issues quickly and help shape an outstanding customer experience.',
                'responsibilities' => [
                    'Resolve customer questions promptly and empathetically',
                    'Document issues and escalate when needed',
                    'Share customer feedback with product teams',
                    'Maintain high satisfaction and response quality',
                ],
                'requirements' => [
                    'Great written and verbal communication',
                    'Patient, calm and solution-oriented',
                    'Comfortable learning new tools quickly',
                    'Interest in fintech or SaaS is a plus',
                ],
                'benefits' => [
                    'Health insurance',
                    'Learning stipend',
                    'Friendly team culture',
                    'Growth opportunities',
                ],
            ],
            [
                'company' => 'Interswitch', 'category' => 'Technology', 'title' => 'Full-Stack Developer',
                'slug' => 'full-stack-developer', 'location' => 'Lagos, Nigeria', 'workplace' => 'hybrid',
                'employment_type' => 'full-time', 'level' => 'Mid Level', 'tags' => ['Node.js', 'React', 'PostgreSQL'],
                'salary_min' => 60000, 'salary_max' => 90000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 4, 'status' => 'open', 'is_featured' => false, 'is_verified' => true,
                'view_count' => 420, 'applications_count' => 17,
                'description' => 'Own features end-to-end for our merchant platforms, from schema design through polished UI and CI/CD.',
                'responsibilities' => ['Build full-stack features end-to-end', 'Participate in code reviews', 'Tune database queries for scale'],
                'requirements' => ['Strong Node.js and React experience', 'Solid PostgreSQL and REST API skills', 'Comfort with Docker and CI/CD'],
                'benefits' => ['Competitive salary', 'Learning budget', 'Hybrid flexibility'],
            ],
            [
                'company' => 'Andela', 'category' => 'Technology', 'title' => 'DevOps Engineer',
                'slug' => 'devops-engineer', 'location' => 'Kano, Nigeria', 'workplace' => 'remote',
                'employment_type' => 'full-time', 'level' => 'Senior', 'tags' => ['Terraform', 'Kubernetes', 'AWS'],
                'salary_min' => 75000, 'salary_max' => 105000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 5, 'status' => 'open', 'is_featured' => false, 'is_verified' => true,
                'view_count' => 380, 'applications_count' => 13,
                'description' => 'Own multi-tenant platform infrastructure, observability and release automation for a global engineering network.',
                'responsibilities' => ['Manage infrastructure-as-code', 'Build CI/CD pipelines', 'Maintain observability tooling'],
                'requirements' => ['Terraform and Kubernetes expertise', 'AWS production experience', 'Scripting fluency in Python'],
                'benefits' => ['Remote-first', 'Equipment budget', 'Conference allowance'],
            ],
            [
                'company' => 'Microsoft', 'category' => 'Technology', 'title' => 'Platform Engineer',
                'slug' => 'platform-engineer', 'location' => 'Abuja, Nigeria', 'workplace' => 'hybrid',
                'employment_type' => 'full-time', 'level' => 'Senior', 'tags' => ['Kubernetes', 'Go', 'ArgoCD'],
                'salary_min' => 105000, 'salary_max' => 140000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 6, 'status' => 'open', 'is_featured' => false, 'is_verified' => true,
                'view_count' => 450, 'applications_count' => 20,
                'description' => 'Run the internal developer platform for product teams, hardening self-service environments and delivery reliability.',
                'responsibilities' => ['Build developer tooling and platforms', 'Champion service reliability', 'Cut environment setup friction'],
                'requirements' => ['Deep Kubernetes and Go experience', 'Platform engineering background', 'Strong SRE fundamentals'],
                'benefits' => ['Hybrid work options', 'Annual bonus', 'Top-shelf equipment'],
            ],
            [
                'company' => 'Andela', 'category' => 'Technology', 'title' => 'QA Engineer',
                'slug' => 'qa-engineer', 'location' => 'Enugu, Nigeria', 'workplace' => 'remote',
                'employment_type' => 'full-time', 'level' => 'Mid Level', 'tags' => ['Playwright', 'Cypress', 'CI/CD'],
                'salary_min' => 45000, 'salary_max' => 65000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 7, 'status' => 'open', 'is_featured' => false, 'is_verified' => true,
                'view_count' => 300, 'applications_count' => 11,
                'description' => 'Harden release pipelines with automated E2E and performance test suites across our client projects.',
                'responsibilities' => ['Build E2E test suites', 'Champion test coverage', 'Track defect metrics'],
                'requirements' => ['Playwright or Cypress experience', 'API testing with Postman', 'CI/CD integration know-how'],
                'benefits' => ['Remote-first', 'Health cover', 'Training stipend'],
            ],
            [
                'company' => 'Dangote', 'category' => 'Marketing', 'title' => 'Project Manager',
                'slug' => 'project-manager', 'location' => 'Abuja, Nigeria', 'workplace' => 'on-site',
                'employment_type' => 'full-time', 'level' => 'Senior', 'tags' => ['Agile', 'Scrum', 'Jira'],
                'salary_min' => 55000, 'salary_max' => 80000, 'salary_currency' => 'USD', 'salary_period' => 'year',
                'posted_days_ago' => 5, 'status' => 'open', 'is_featured' => false, 'is_verified' => true,
                'view_count' => 350, 'applications_count' => 18,
                'description' => 'Lead cross-functional digital delivery, keeping large programs on time, on budget and aligned to business outcomes.',
                'responsibilities' => ['Run agile ceremonies', 'Manage budgets and roadmaps', 'Coordinate stakeholders'],
                'requirements' => ['PMP or equivalent', '6+ years delivery leadership', 'Excellent communication'],
                'benefits' => ['Competitive salary', 'Health cover', 'Career growth paths'],
            ],
        ];

        foreach ($jobs as $job) {
            $company = Company::where('name', $job['company'])->first();
            $category = Category::where('name', $job['category'])->first();
            $postedDaysAgo = $job['posted_days_ago'];
            unset($job['company'], $job['category'], $job['posted_days_ago']);

            Job::updateOrCreate(['slug' => $job['slug']], $job + [
                'company_id' => $company?->id,
                'category_id' => $category?->id,
                'user_id' => $company?->user_id,
                'posted_at' => now()->subDays($postedDaysAgo),
                'expires_at' => now()->addDays(60)->subDays($postedDaysAgo),
            ]);
        }
    }
}
