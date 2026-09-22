<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Education;
use App\Models\Experience;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Seeder;

class SeekerSeeder extends Seeder
{
    public function run(): void
    {
        $seekers = [
            [
                'name' => 'Ada Obi', 'email' => 'ada.obi@mail.com', 'phone' => '+234 801 234 5678',
                'location' => 'Lagos, Nigeria', 'role_title' => 'Frontend Engineer', 'years' => '5 years', 'notice' => 'Immediate',
                'summary' => 'Frontend engineer with 5+ years building accessible, high-traffic web applications. Specialist in React, TypeScript and design systems, with a track record of mentoring engineers and shipping performant features used by millions.',
                'skills' => ['React', 'TypeScript', 'CSS', 'Next.js', 'GraphQL', 'Vitest'],
                'certifications' => ['AWS Certified Developer – Associate'],
                'portfolio' => ['github.com/adaobi', 'adaobi.dev'],
                'experience' => [
                    ['role' => 'Senior Frontend Engineer', 'organization' => 'Paystack', 'start_date' => '2021', 'end_date' => null, 'current' => true, 'text' => 'Own the checkout experience component library. Reduced bundle size by 38% and lifted Core Web Vitals scores across the product.'],
                    ['role' => 'Frontend Engineer', 'organization' => 'Andela', 'start_date' => '2018', 'end_date' => '2021', 'current' => false, 'text' => 'Built client-facing dashboards in React and ran migration from jQuery to a typed React codebase.'],
                ],
                'education' => [
                    ['school' => 'University of Lagos', 'degree' => 'B.Sc. Computer Science', 'start_date' => '2014', 'end_date' => '2018'],
                ],
            ],
            [
                'name' => 'Tunde Bakare', 'email' => 'tunde.bakare@mail.com', 'phone' => '+234 802 345 6789',
                'location' => 'Abuja, Nigeria', 'role_title' => 'Full-Stack Developer', 'years' => '6 years', 'notice' => '2 weeks',
                'summary' => 'Full-stack developer experienced across Node.js, React and PostgreSQL. Comfortable owning features end-to-end from schema design to polished UI and CI/CD.',
                'skills' => ['Node.js', 'React', 'PostgreSQL', 'Docker', 'REST APIs', 'Redis'],
                'certifications' => ['Certified Kubernetes Administrator'],
                'portfolio' => ['github.com/tundebakare'],
                'experience' => [
                    ['role' => 'Full-Stack Developer', 'organization' => 'Interswitch', 'start_date' => '2020', 'end_date' => null, 'current' => true, 'text' => 'Lead engineer on the merchant onboarding portal serving 20k+ businesses. Cut dispute resolution time by half with automated tooling.'],
                    ['role' => 'Software Engineer', 'organization' => 'Flutterwave', 'start_date' => '2017', 'end_date' => '2020', 'current' => false, 'text' => 'Built internal ops tooling and payment reconciliation dashboards.'],
                ],
                'education' => [
                    ['school' => 'Covenant University', 'degree' => 'B.Eng. Software Engineering', 'start_date' => '2013', 'end_date' => '2017'],
                ],
            ],
            [
                'name' => 'Chidinma Nwosu', 'email' => 'chidinma.nwosu@mail.com', 'phone' => '+234 803 456 7890',
                'location' => 'Lagos, Nigeria', 'role_title' => 'Backend Engineer', 'years' => '4 years', 'notice' => 'Immediate',
                'summary' => 'Backend engineer focused on building secure, scalable APIs and event-driven systems. Strong background in NestJS, Kafka and cloud-native deployment on AWS.',
                'skills' => ['NestJS', 'Node.js', 'AWS', 'Kafka', 'TypeScript', 'MongoDB'],
                'certifications' => ['AWS Solutions Architect – Associate'],
                'portfolio' => ['github.com/chidinmanwosu'],
                'experience' => [
                    ['role' => 'Backend Engineer', 'organization' => 'Paystack', 'start_date' => '2021', 'end_date' => null, 'current' => true, 'text' => 'Designed and shipped the payout scheduling service handling ₦300M+ daily volume.'],
                    ['role' => 'Junior Developer', 'organization' => 'Sterling Bank', 'start_date' => '2019', 'end_date' => '2021', 'current' => false, 'text' => 'Maintained core banking APIs and internal microservices.'],
                ],
                'education' => [
                    ['school' => 'Obafemi Awolowo University', 'degree' => 'B.Sc. Computer Science', 'start_date' => '2014', 'end_date' => '2018'],
                ],
            ],
            [
                'name' => 'Ibrahim Musa', 'email' => 'ibrahim.musa@mail.com', 'phone' => '+234 804 567 8901',
                'location' => 'Kano, Nigeria', 'role_title' => 'DevOps Engineer', 'years' => '5 years', 'notice' => '1 month',
                'summary' => 'DevOps engineer specialising in infrastructure-as-code, CI/CD pipelines and observability. Experienced running production workloads on AWS and GCP.',
                'skills' => ['Terraform', 'Kubernetes', 'AWS', 'GitHub Actions', 'Prometheus', 'Python'],
                'certifications' => ['AWS DevOps Engineer – Professional', 'CKA'],
                'portfolio' => ['github.com/ibrahimmusa'],
                'experience' => [
                    ['role' => 'DevOps Engineer', 'organization' => 'Andela', 'start_date' => '2020', 'end_date' => null, 'current' => true, 'text' => 'Own multi-tenant platform infrastructure serving 40k+ engineers across 12 regions.'],
                    ['role' => 'Systems Administrator', 'organization' => 'Dangote', 'start_date' => '2017', 'end_date' => '2020', 'current' => false, 'text' => 'Managed on-premise hosting and migrated core workloads to the cloud.'],
                ],
                'education' => [
                    ['school' => 'Ahmadu Bello University', 'degree' => 'B.Eng. Electrical Engineering', 'start_date' => '2012', 'end_date' => '2017'],
                ],
            ],
            [
                'name' => 'Fatima Sani', 'email' => 'fatima.sani@mail.com', 'phone' => '+234 805 678 9012',
                'location' => 'Lagos, Nigeria', 'role_title' => 'Data Analyst', 'years' => '3 years', 'notice' => 'Hired',
                'summary' => 'Data analyst who turns messy data into clear decisions. Skilled in SQL, Tableau and Python with experience building executive dashboards that drive strategy.',
                'skills' => ['SQL', 'Tableau', 'Python', 'Excel', 'Looker', 'dbt'],
                'certifications' => ['Google Data Analytics Professional'],
                'portfolio' => ['public.tableau.com/fatimasani'],
                'experience' => [
                    ['role' => 'Data Analyst', 'organization' => 'Interswitch', 'start_date' => '2021', 'end_date' => null, 'current' => true, 'text' => 'Built the revenue dashboard used by leadership, automating weekly reporting for 8 products.'],
                    ['role' => 'Analyst', 'organization' => 'Sterling Bank', 'start_date' => '2019', 'end_date' => '2021', 'current' => false, 'text' => 'Produced regulatory and risk reports; reduced report turnaround by 60%.'],
                ],
                'education' => [
                    ['school' => 'Bayero University Kano', 'degree' => 'B.Sc. Statistics', 'start_date' => '2014', 'end_date' => '2018'],
                ],
            ],
            [
                'name' => 'Emeka Okafor', 'email' => 'emeka.okafor@mail.com', 'phone' => '+234 806 789 0123',
                'location' => 'Lagos, Nigeria', 'role_title' => 'Product Designer', 'years' => '4 years', 'notice' => 'N/A',
                'summary' => 'Product designer with a bias for research-led, accessible design. Experienced spanning fintech and consumer products.',
                'skills' => ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Accessibility'],
                'certifications' => [],
                'portfolio' => ['dribbble.com/emekaokafor'],
                'experience' => [
                    ['role' => 'Product Designer', 'organization' => 'Flutterwave', 'start_date' => '2021', 'end_date' => null, 'current' => true, 'text' => 'Led redesign of the business dashboard, lifting activation by 22%.'],
                ],
                'education' => [
                    ['school' => 'Yaba College of Technology', 'degree' => 'ND Industrial Design', 'start_date' => '2014', 'end_date' => '2016'],
                ],
            ],
            [
                'name' => 'Ngozi Eze', 'email' => 'ngozi.eze@mail.com', 'phone' => '+234 807 890 1234',
                'location' => 'Enugu, Nigeria', 'role_title' => 'QA Engineer', 'years' => '3 years', 'notice' => '2 weeks',
                'summary' => 'QA engineer hardening release pipelines with automated E2E and performance test suites. Meticulous, data-driven defect hunting.',
                'skills' => ['Playwright', 'Cypress', 'Postman', 'Selenium', 'JMeter', 'CI/CD'],
                'certifications' => ['ISTQB Foundation Level'],
                'portfolio' => ['github.com/ngozieze'],
                'experience' => [
                    ['role' => 'QA Engineer', 'organization' => 'Andela', 'start_date' => '2021', 'end_date' => null, 'current' => true, 'text' => 'Reduced critical bugs reaching production by 45% through automated E2E coverage.'],
                ],
                'education' => [
                    ['school' => 'University of Nigeria, Nsukka', 'degree' => 'B.Sc. Computer Science', 'start_date' => '2015', 'end_date' => '2019'],
                ],
            ],
            [
                'name' => 'Yusuf Adeyemi', 'email' => 'yusuf.adeyemi@mail.com', 'phone' => '+234 808 901 2345',
                'location' => 'Lagos, Nigeria', 'role_title' => 'DevOps Engineer', 'years' => '7 years', 'notice' => 'Immediate',
                'summary' => 'Platform engineer focused on developer experience, service reliability and cost-efficient cloud operations at scale.',
                'skills' => ['Kubernetes', 'Go', 'AWS', 'Istio', 'ArgoCD', 'Observability'],
                'certifications' => ['AWS Solutions Architect – Professional', 'CKS'],
                'portfolio' => ['github.com/yusufadeyemi'],
                'experience' => [
                    ['role' => 'Platform Engineer', 'organization' => 'Microsoft', 'start_date' => '2021', 'end_date' => null, 'current' => true, 'text' => 'Ran the internal developer platform for 200+ product teams; cut environment setup from days to minutes.'],
                    ['role' => 'Site Reliability Engineer', 'organization' => 'Interswitch', 'start_date' => '2017', 'end_date' => '2021', 'current' => false, 'text' => 'Owned uptime for payment core; achieved 99.99% availability during peak cycles.'],
                ],
                'education' => [
                    ['school' => 'University of Ibadan', 'degree' => 'B.Sc. Computer Science', 'start_date' => '2011', 'end_date' => '2015'],
                ],
            ],
            [
                'name' => 'Aisha Bello', 'email' => 'aisha.bello@mail.com', 'phone' => '+234 809 012 3456',
                'location' => 'Abuja, Nigeria', 'role_title' => 'Project Manager', 'years' => '6 years', 'notice' => '1 month',
                'summary' => 'Project manager with 6 years delivering digital products on time and on budget. Certified PMP with a calm, structured communication style.',
                'skills' => ['Agile', 'Scrum', 'Jira', 'Stakeholder Management', 'Roadmapping', 'Budgeting'],
                'certifications' => ['PMP', 'Certified ScrumMaster'],
                'portfolio' => [],
                'experience' => [
                    ['role' => 'Senior Project Manager', 'organization' => 'Dangote', 'start_date' => '2020', 'end_date' => null, 'current' => true, 'text' => 'Led a ₦500M digital transformation program spanning 9 workstreams and 60 people.'],
                    ['role' => 'Project Manager', 'organization' => 'Flutterwave', 'start_date' => '2017', 'end_date' => '2020', 'current' => false, 'text' => 'Shipped 20+ releases across payments and onboarding squads.'],
                ],
                'education' => [
                    ['school' => 'University of Abuja', 'degree' => 'M.Sc. Project Management', 'start_date' => '2016', 'end_date' => '2018'],
                ],
            ],
            [
                'name' => 'Tobi Alabi', 'email' => 'tobi.alabi@mail.com', 'phone' => '+234 810 123 4567',
                'location' => 'Lagos, Nigeria', 'role_title' => 'Frontend Engineer', 'years' => '6 years', 'notice' => 'Hired',
                'summary' => 'Frontend engineer and design-system enthusiast who has shipped consumer apps used by millions across Africa.',
                'skills' => ['React', 'TypeScript', 'Vue', 'CSS Architecture', 'Web Performance', 'Storybook'],
                'certifications' => [],
                'portfolio' => ['github.com/tobialabi'],
                'experience' => [
                    ['role' => 'Senior Frontend Engineer', 'organization' => 'Interswitch', 'start_date' => '2020', 'end_date' => null, 'current' => true, 'text' => 'Built the design system now used across 14 products; championed performance budgets.'],
                    ['role' => 'Frontend Engineer', 'organization' => 'Interswitch', 'start_date' => '2017', 'end_date' => '2020', 'current' => false, 'text' => 'Developed customer-facing banking flows.'],
                ],
                'education' => [
                    ['school' => 'Lagos State University', 'degree' => 'B.Sc. Information Technology', 'start_date' => '2012', 'end_date' => '2016'],
                ],
            ],
        ];

        foreach ($seekers as $seeker) {
            $user = User::updateOrCreate(['email' => $seeker['email']], [
                'name' => $seeker['name'],
                'role' => UserRole::Seeker,
                'status' => AccountStatus::Active,
                'password' => 'password',
                'phone' => $seeker['phone'],
                'headline' => $seeker['role_title'],
                'email_verified_at' => now(),
            ]);

            $profile = Profile::updateOrCreate(['user_id' => $user->id], [
                'headline' => $seeker['role_title'],
                'location' => $seeker['location'],
                'summary' => $seeker['summary'],
                'years_experience' => $seeker['years'],
                'notice_period' => $seeker['notice'],
                'skills' => $seeker['skills'],
                'certifications' => $seeker['certifications'],
                'portfolio' => $seeker['portfolio'],
            ]);

            $profile->experiences()->delete();
            foreach ($seeker['experience'] as $index => $item) {
                Experience::create([
                    'profile_id' => $profile->id,
                    'role' => $item['role'],
                    'organization' => $item['organization'],
                    'start_date' => $item['start_date'],
                    'end_date' => $item['end_date'],
                    'current' => $item['current'],
                    'description' => $item['text'],
                    'sort_order' => $index,
                ]);
            }

            $profile->educations()->delete();
            foreach ($seeker['education'] as $index => $item) {
                Education::create([
                    'profile_id' => $profile->id,
                    'school' => $item['school'],
                    'degree' => $item['degree'],
                    'start_date' => $item['start_date'],
                    'end_date' => $item['end_date'],
                    'sort_order' => $index,
                ]);
            }
        }
    }
}
