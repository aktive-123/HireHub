<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\ApplicationStatus;
use App\Enums\HiringFeeLevel;
use App\Enums\JobStatus;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\AdminHiringFeeResource;
use App\Http\Resources\V1\AdminJobResource;
use App\Http\Resources\V1\ApplicationResource;
use App\Http\Resources\V1\CompanyResource;
use App\Http\Resources\V1\PaymentResource;
use App\Models\ActivityLog;
use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\HiringFee;
use App\Models\HiringFeeRate;
use App\Models\Job;
use App\Models\JobSeekerUpsell;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Profile;
use App\Models\SavedJob;
use App\Models\Setting;
use App\Models\User;
use App\Services\HiringFeeService;
use App\Services\Upsell\UpsellCatalogue;
use App\Support\Notifier;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends ApiController
{
    /**
     * Mirrors ApplicationStatus. Restated rather than derived from the enum so
     * the admin moderation route and the employer route each state the set of
     * statuses they accept, and a value added to the enum is a deliberate
     * decision in both places rather than a silent widening.
     */
    private const APPLICATION_STATUSES = [
        'new', 'reviewing', 'shortlisted', 'interview',
        'offer', 'offer_confirmed_pending_acceptance', 'hired', 'rejected', 'withdrawn',
    ];

    public function dashboard(Request $request)
    {
        $users = User::count();
        $seekers = User::where('role', 'seeker')->count();
        $employers = User::where('role', 'employer')->count();
        $companies = Company::where('status', 'active')->count();
        $jobs = Job::count();
        $activeJobs = Job::where('status', JobStatus::Open->value)->count();
        $applications = Application::count();

        $monthly = [];
        foreach (CarbonPeriod::create(now()->subMonths(7)->startOfMonth(), '1 month', now()->startOfMonth()) as $period) {
            $monthly[] = [
                'label' => $period->format('M'),
                'new_users' => User::whereBetween('created_at', [$period->copy()->startOfMonth(), $period->copy()->endOfMonth()])->count(),
                'applications' => Application::whereBetween('applied_at', [$period->copy()->startOfMonth(), $period->copy()->endOfMonth()])->count(),
            ];
        }

        $recentActivity = ActivityLog::with('user:id,name')
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(fn (ActivityLog $log) => [
                'actor' => $log->actor_name ?? $log->user?->name ?? 'System',
                'action' => $log->action,
                'target' => $log->target_name,
                'time' => $log->created_at?->diffForHumans(),
                'level' => $log->level,
            ]);

        return $this->success([
            'stats' => [
                ['key' => 'users', 'label' => 'Total users', 'value' => $users],
                ['key' => 'seekers', 'label' => 'Job seekers', 'value' => $seekers],
                ['key' => 'employers', 'label' => 'Employers', 'value' => $employers],
                ['key' => 'companies', 'label' => 'Companies', 'value' => $companies],
                ['key' => 'jobs', 'label' => 'Total jobs', 'value' => $jobs],
                ['key' => 'active_jobs', 'label' => 'Active jobs', 'value' => $activeJobs],
                ['key' => 'applications', 'label' => 'Applications', 'value' => $applications],
            ],
            'by_month' => $monthly,
            'recent_activity' => $recentActivity,
        ], 'Admin dashboard retrieved.');
    }

    public function users(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = User::query()
            ->when($request->filled('role'), fn ($q) => $q->where('role', $request->input('role')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', '%'.$request->input('q').'%')->orWhere('email', 'like', '%'.$request->input('q').'%')))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->success(
            $paginator->map($this->userShape(...))->values(),
            'Users retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    private function userShape(User $user): array
    {
        $isEmployer = $user->role->value === 'employer';
        $isSeeker = $user->role->value === 'seeker';

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_url' => $user->profilePictureUrl(),
            'phone' => $user->phone,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'status' => $user->status->value,
            'status_label' => $user->status->label(),
            'headline' => $user->profile?->headline ?? $user->company?->name,
            'location' => $user->profile?->location ?? $user->company?->location,
            'joined' => $user->created_at?->diffForHumans(),
            'joined_at' => $user->created_at?->toIso8601String(),
            // Derived from updated_at, matching UserResource, so the console
            // shows a real "last activity" instead of echoing the join date.
            'last_active' => $user->updated_at?->diffForHumans(),
            'verified' => (bool) $user->email_verified_at,
            'company' => $user->company?->name,
            'company_slug' => $user->company?->slug,
            'industry' => $user->company?->industry,
            'years_experience' => $user->profile?->years_experience,
            'jobs_count' => $isEmployer ? Job::where('company_id', $user->company?->id ?? 0)->count() : null,
            'applications_count' => $isSeeker ? Application::where('seeker_id', $user->id)->count() : null,
            'saved_jobs_count' => $isSeeker ? SavedJob::where('seeker_id', $user->id)->count() : null,
        ];
    }

    public function updateUserStatus(Request $request, User $user)
    {
        abort_if($user->id === $request->user()->id, 403, 'You cannot change your own status.');
        abort_if($user->role->value === 'admin' && $user->id !== $request->user()->id, 403, 'Admin accounts cannot be modified from the console.');

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(collect(AccountStatus::cases())->map->value->all())],
        ]);

        // `status` is a privilege column and is deliberately not mass
        // assignable, so an admin elevation can only happen here, behind the
        // checks above and the value allowlist.
        $user->forceFill(['status' => $validated['status']])->save();

        ActivityLog::record($request->user(), 'updated user status', $user, request: $request);

        return $this->success($this->userShape($user->refresh()), 'User status updated.');
    }

    public function deleteUser(Request $request, User $user)
    {
        abort_if($user->id === $request->user()->id, 403, 'You cannot delete your own account.');

        $name = $user->name;
        $user->delete();

        ActivityLog::record($request->user(), 'deleted user', null, 'warning', $request)
            ->update(['target_name' => $name]);

        return $this->success(null, 'User deleted.');
    }

    public function jobSeekers(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = User::where('role', 'seeker')
            ->with('profile')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', '%'.$request->input('q').'%')->orWhere('email', 'like', '%'.$request->input('q').'%')))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->success(
            $paginator->map(fn (User $user) => [
                ...$this->userShape($user),
                'headline' => $user->profile?->headline,
                'location' => $user->profile?->location,
                'skills' => $user->profile?->skills ?? [],
                'cv' => (bool) $user->profile?->cv_path,
            ])->values(),
            'Job seekers retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function employers(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = User::where('role', 'employer')
            ->with('company')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', '%'.$request->input('q').'%')->orWhere('email', 'like', '%'.$request->input('q').'%')))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->success(
            $paginator->map(fn (User $user) => [
                ...$this->userShape($user),
                'company' => $user->company?->name,
                'company_status' => $user->company?->status,
                'jobs_count' => $user->company ? Job::where('company_id', $user->company->id)->count() : 0,
            ])->values(),
            'Employers retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function companies(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = Company::withCount('jobs')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', '%'.$request->input('q').'%')))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->success(
            $paginator->map(fn (Company $company) => [
                'id' => $company->id,
                'name' => $company->name,
                'industry' => $company->industry,
                'location' => $company->location,
                'size' => $company->size,
                'jobs_count' => $company->jobs_count,
                'status' => $company->status,
                'verified' => (bool) $company->is_verified,
                'user_id' => $company->user_id,
                'created_at' => $company->created_at?->toIso8601String(),
            ])->values(),
            'Companies retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function updateCompanyStatus(Request $request, Company $company)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:active,pending,flagged,suspended'],
        ]);

        $company->forceFill(['status' => $validated['status']])->save();

        return $this->success(new CompanyResource($company), 'Company status updated.');
    }

    /**
     * Creates a company on an employer's behalf.
     *
     * Used by the console for companies that exist before (or without) a
     * completed signup — a vacancy published under a brand name, an unclaimed
     * listing. The owner is therefore optional: `users.user_id` on companies
     * is nullable precisely so a company can predate its account, and the
     * account can be linked later with updateCompany.
     *
     * A company created here never inherits a verified badge or a rating, so
     * an admin cannot hand out trust signals that the verification flow owns.
     */
    public function storeCompany(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'industry' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'size' => ['nullable', 'string', 'max:255'],
            'founded' => ['nullable', 'integer', 'between:1600,2100'],
            'website' => ['nullable', 'url', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'logo_text' => ['nullable', 'string', 'max:4'],
            'logo_bg' => ['nullable', 'string', 'max:9'],
            'logo_color' => ['nullable', 'string', 'max:9'],
        ]);

        $ownerId = $this->assertCompanyOwner($validated['user_id'] ?? null);

        $company = new Company;
        $company->slug = Str::slug($validated['name']).'-'.strtolower(Str::random(6));
        $company->fill(Arr::except($validated, 'user_id'));
        $company->user_id = $ownerId;
        $company->save();

        // Modelled the same way as a signup: active but unverified, so the
        // company shows up immediately without carrying a trust badge.
        $company->forceFill(['status' => 'active', 'is_verified' => false])->save();

        return $this->success(new CompanyResource($company), 'Company created.', 201);
    }

    /**
     * Admin-wide company edit. Unlike the employer route, this is not scoped to
     * the caller's own company, because an admin moderates every tenant.
     */
    public function updateCompany(Request $request, Company $company)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'industry' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'size' => ['nullable', 'string', 'max:255'],
            'founded' => ['nullable', 'integer', 'between:1600,2100'],
            'website' => ['nullable', 'url', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'logo_text' => ['nullable', 'string', 'max:4'],
            'logo_bg' => ['nullable', 'string', 'max:9'],
            'logo_color' => ['nullable', 'string', 'max:9'],
        ]);

        if (array_key_exists('user_id', $validated)) {
            $company->user_id = $this->assertCompanyOwner($validated['user_id']);
        }

        if (isset($validated['name']) && $validated['name'] !== $company->name) {
            // Keep the slug addressing this company after a rename, and keep it
            // unique by re-suffixing rather than overwriting an existing slug.
            $company->slug = Str::slug($validated['name']).'-'.$company->id;
        }

        $company->fill(Arr::except($validated, 'user_id'));
        $company->save();

        return $this->success(new CompanyResource($company), 'Company updated.');
    }

    /**
     * A company may only be linked to an employer account, so a typo in the
     * owner id is reported as a validation error instead of silently
     * attaching the company to a job seeker.
     */
    private function assertCompanyOwner(?int $userId): ?int
    {
        if ($userId === null) {
            return null;
        }

        $owner = User::find($userId);
        if (! $owner || $owner->role !== UserRole::Employer) {
            throw ValidationException::withMessages([
                'user_id' => ['The selected user is not an employer account.'],
            ]);
        }

        return $owner->id;
    }

    public function jobs(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = Job::with(['category:id,slug,name,icon', 'company:id,slug,name,logo_text,logo_bg,logo_color,is_verified'])
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w->where('title', 'like', '%'.$request->input('q').'%')->orWhereHas('company', fn ($c) => $c->where('name', 'like', '%'.$request->input('q').'%'))))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->success(
            AdminJobResource::collection($paginator->items()),
            'Jobs retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function updateJobStatus(Request $request, Job $job)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(collect(JobStatus::cases())->map->value->all())],
        ]);

        $job->update(['status' => $validated['status']]);

        return $this->success(new AdminJobResource($job->load('company')), 'Job status updated.');
    }

    public function deleteJob(Request $request, Job $job)
    {
        $title = $job->title;
        $job->delete();

        return $this->success(null, 'Job deleted.');
    }

    public function applications(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = Application::with(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone,avatar_url,profile_picture', 'seeker.profile.experiences', 'seeker.profile.educations'])
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->when($request->filled('q'), fn ($q) => $q->whereHas('seeker', fn ($s) => $s->where('name', 'like', '%'.$request->input('q').'%'))->orWhereHas('job', fn ($j) => $j->where('title', 'like', '%'.$request->input('q').'%')))
            ->orderByDesc('applied_at')
            ->paginate($perPage);

        return $this->success(
            ApplicationResource::collection($paginator->items()),
            'Applications retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    /**
     * A single application with everything the console's detail view needs.
     *
     * The list endpoint already returns most of this, but the admin "view"
     * action fetches fresh detail on open so the panel cannot show a stale
     * status after someone else moved the application along.
     */
    public function application(Request $request, Application $application)
    {
        $application->load([
            'job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified',
            'seeker:id,name,email,phone,avatar_url,profile_picture',
            'seeker.profile.experiences',
            'seeker.profile.educations',
        ]);

        return $this->success(new ApplicationResource($application), 'Application retrieved.');
    }

    /**
     * Admin-side status change.
     *
     * Deliberately separate from the employer route even though it writes the
     * same column: an employer may only move their own company's applications,
     * whereas moderation is a platform-wide action. The status list is
     * restated rather than shared so the two routes cannot drift apart.
     */
    public function updateApplicationStatus(Request $request, Application $application)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(self::APPLICATION_STATUSES)],
        ]);

        $application->update(['status' => $validated['status']]);

        // Keep the seeker informed: an admin moving an application behind the
        // scenes should still be visible to the candidate.
        Notifier::send($application->seeker, [
            'category' => 'applications',
            'type' => 'status',
            'icon' => 'bi-arrow-repeat',
            'text' => 'Your application for '.($application->job?->title ?? 'a job').' is now '.($application->status?->label() ?? $validated['status']).'.',
            'action' => 'View application',
            'link' => '/seeker/applications',
            'subject' => 'Application update — '.($application->job?->title ?? 'a job'),
        ]);

        $application->load(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone,avatar_url,profile_picture']);

        return $this->success(new ApplicationResource($application), 'Application status updated.');
    }

    public function categories(Request $request)
    {
        $categories = Category::withCount('jobs')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return $this->success($categories->map(fn (Category $category) => [
            'id' => $category->id,
            'slug' => $category->slug,
            'name' => $category->name,
            'icon' => $category->icon,
            'description' => $category->description,
            'sort_order' => $category->sort_order,
            'status' => $category->status,
            'jobs_count' => $category->jobs_count,
        ]), 'Categories retrieved.');
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
        ]);

        $category = Category::create($validated + [
            'slug' => Str::slug($validated['name']).'-'.strtolower(Str::random(5)),
            'sort_order' => $validated['sort_order'] ?? 0,
            'status' => $validated['status'] ?? 'active',
        ]);

        return $this->success(['id' => $category->id, 'slug' => $category->slug, 'name' => $category->name, 'icon' => $category->icon], 'Category created.', 201);
    }

    public function updateCategory(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
        ]);

        $category->update($validated);

        return $this->success(['id' => $category->id, 'slug' => $category->slug, 'name' => $category->name, 'icon' => $category->icon], 'Category updated.');
    }

    public function deleteCategory(Request $request, Category $category)
    {
        if ($category->jobs()->exists()) {
            return $this->error('Cannot delete a category that still has jobs.', 409);
        }

        $category->delete();

        return $this->success(null, 'Category deleted.');
    }

    /**
     * Plan catalogue with revenue, so admins can price plans in one place.
     */
    public function plans(Request $request)
    {
        $plans = Plan::withCount(['subscriptions', 'payments'])
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get();

        return $this->success($plans->map(fn (Plan $plan) => [
            'id' => $plan->id,
            'slug' => $plan->slug,
            'name' => $plan->name,
            'tagline' => $plan->tagline,
            'price' => $plan->price,
            'price_display' => $plan->formattedPrice(),
            'currency' => $plan->currency,
            'billing_period' => $plan->billing_period,
            'job_post_limit' => $plan->job_post_limit,
            'featured_job_limit' => $plan->featured_job_limit,
            'cv_view_limit' => $plan->cv_view_limit,
            'features' => $plan->features ?? [],
            'is_featured' => $plan->is_featured,
            'is_active' => $plan->is_active,
            'sort_order' => $plan->sort_order,
            'subscriptions_count' => $plan->subscriptions_count,
            'payments_count' => $plan->payments_count,
        ]), 'Plans retrieved.');
    }

    public function storePlan(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'billing_period' => ['nullable', 'string', Rule::in(['monthly', 'yearly'])],
            'job_post_limit' => ['nullable', 'integer', 'min:0'],
            'featured_job_limit' => ['nullable', 'integer', 'min:0'],
            'cv_view_limit' => ['nullable', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
            'is_featured' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $plan = Plan::create($validated + [
            'slug' => Str::slug($validated['name']).'-'.strtolower(Str::random(5)),
            'currency' => $validated['currency'] ?? config('payments.currency', 'NGN'),
            'billing_period' => $validated['billing_period'] ?? 'monthly',
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        ActivityLog::record($request->user(), 'plan.create', "Created plan {$plan->name}");

        return $this->success(['id' => $plan->id, 'slug' => $plan->slug, 'name' => $plan->name], 'Plan created.', 201);
    }

    public function updatePlan(Request $request, Plan $plan)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'price' => ['sometimes', 'integer', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'billing_period' => ['sometimes', 'string', Rule::in(['monthly', 'yearly'])],
            'job_post_limit' => ['sometimes', 'integer', 'min:0'],
            'featured_job_limit' => ['sometimes', 'integer', 'min:0'],
            'cv_view_limit' => ['sometimes', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $plan->update($validated);

        ActivityLog::record($request->user(), 'plan.update', "Updated plan {$plan->name}");

        return $this->success(['id' => $plan->id, 'slug' => $plan->slug, 'name' => $plan->name], 'Plan updated.');
    }

    /**
     * Plans are never hard-deleted once money is involved. A plan with
     * payments must be deactivated so historical invoices keep resolving.
     */
    public function deletePlan(Request $request, Plan $plan)
    {
        if ($plan->payments()->exists()) {
            $plan->update(['is_active' => false]);

            return $this->error('This plan has payments and cannot be deleted. It has been deactivated instead.', 409);
        }

        if ($plan->subscriptions()->live()->exists()) {
            return $this->error('Cannot delete a plan with an active subscription.', 409);
        }

        $plan->delete();

        return $this->success(null, 'Plan deleted.');
    }

    public function payments(Request $request)
    {
        $payments = Payment::with(['plan:id,slug,name', 'user:id,name,email', 'company:id,name'])
            ->orderByDesc('id')
            ->limit(min(200, max(1, (int) $request->input('per_page', 50))))
            ->get();

        return $this->success(PaymentResource::collection($payments), 'Payments retrieved.');
    }

    /*
    |--------------------------------------------------------------------------
    | Hiring fees
    |--------------------------------------------------------------------------
    */

    /**
     * Placement-fee revenue, read live from `hiring_fees`.
     *
     * Aggregated in the database rather than by loading rows and summing in
     * PHP: this table grows with every hire, and the dashboard is the first
     * thing an admin opens, so the whole point is that it stays fast as volume
     * does. Only `succeeded` rows count toward collected revenue — a pending
     * checkout is not money until the gateway says it is.
     */
    public function hiringFeeSummary(Request $request)
    {
        $period = (int) min(365, max(1, (int) $request->input('days', 30)));
        $since = now()->subDays($period);
        $currency = $this->hiringFees->currency();

        // Base query for the window, scoped to the same filters the list uses so
        // the headline numbers always describe the rows underneath them.
        $window = HiringFee::query()
            ->where('created_at', '>=', $since)
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->when($request->filled('company_id'), fn ($q) => $q->where('company_id', $request->input('company_id')));

        $total = (clone $window)->count();
        $collected = (int) (clone $window)->where('status', PaymentStatus::Succeeded)->sum('amount');
        $pending = (int) (clone $window)->whereIn('status', [PaymentStatus::Pending, PaymentStatus::Processing])->sum('amount');
        $failed = (int) (clone $window)->whereIn('status', [PaymentStatus::Failed, PaymentStatus::Cancelled, PaymentStatus::Refunded])->sum('amount');

        // Status split as counts, not amounts, so an admin can see queue depth.
        $byStatus = (clone $window)
            ->selectRaw('status, count(*) as aggregate, sum(amount) as total')
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => [
                'status' => $row->status,
                'status_label' => $row->status?->label(),
                'count' => (int) $row->aggregate,
                'amount' => (int) $row->total,
            ]);

        $byEmployer = (clone $window)
            ->where('status', PaymentStatus::Succeeded)
            ->selectRaw('employer_id, company_id, count(*) as aggregate, sum(amount) as total')
            ->groupBy('employer_id', 'company_id')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(function ($row) use ($currency) {
                $employer = User::find($row->employer_id);
                $company = $row->company_id ? Company::find($row->company_id) : null;

                return [
                    'employer_id' => $row->employer_id,
                    'employer' => $employer?->name ?? 'Deleted user',
                    'company' => $company?->name,
                    'hires' => (int) $row->aggregate,
                    'amount' => (int) $row->total,
                    'formatted_amount' => $this->hiringFees->format((int) $row->total, $currency),
                ];
            });

        $byJob = (clone $window)
            ->where('status', PaymentStatus::Succeeded)
            ->whereNotNull('job_id')
            ->selectRaw('job_id, count(*) as aggregate, sum(amount) as total')
            ->groupBy('job_id')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(function ($row) use ($currency) {
                $job = Job::find($row->job_id);

                return [
                    'job_id' => $row->job_id,
                    'job' => $job?->title ?? 'Deleted job',
                    'hires' => (int) $row->aggregate,
                    'amount' => (int) $row->total,
                    'formatted_amount' => $this->hiringFees->format((int) $row->total, $currency),
                ];
            });

        $byLevel = (clone $window)
            ->where('status', PaymentStatus::Succeeded)
            ->selectRaw('level, count(*) as aggregate, sum(amount) as total, avg(amount) as average')
            ->groupBy('level')
            ->get()
            ->map(fn ($row) => [
                'level' => $row->level?->value,
                'level_label' => $row->level?->label(),
                'hires' => (int) $row->aggregate,
                'amount' => (int) $row->total,
                'average' => (int) round($row->average),
            ]);

        $trend = HiringFee::query()
            ->where('status', PaymentStatus::Succeeded)
            ->where('paid_at', '>=', $since)
            ->selectRaw('DATE(paid_at) as day, count(*) as hires, sum(amount) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($row) => [
                'day' => $row->day,
                'hires' => (int) $row->hires,
                'amount' => (int) $row->total,
            ]);

        $settledHires = Application::where('status', 'hired')->whereHas('hiringFee', fn ($q) => $q->settled())->count();
        $allHires = Application::where('status', 'hired')->count();

        return $this->success([
            'period_days' => $period,
            'currency' => $currency,
            'total_fees' => $total,
            'collected' => $collected,
            'collected_formatted' => $this->hiringFees->format($collected, $currency),
            'pending' => $pending,
            'pending_formatted' => $this->hiringFees->format($pending, $currency),
            'failed' => $failed,
            'failed_formatted' => $this->hiringFees->format($failed, $currency),
            'average_fee' => $collected > 0 ? (int) round($collected / max(1, (clone $window)->where('status', PaymentStatus::Succeeded)->count())) : 0,
            // Guards the revenue figure: a hire with no settled fee means the
            // data is inconsistent, and the count says how far.
            'hires_total' => $allHires,
            'hires_with_settled_fee' => $settledHires,
            'hires_missing_fee' => max(0, $allHires - $settledHires),
            'by_status' => $byStatus,
            'by_employer' => $byEmployer,
            'by_job' => $byJob,
            'by_level' => $byLevel,
            'trend' => $trend,
        ], 'Hiring fee summary retrieved.');
    }

    /**
     * Add-on revenue, reported separately from hiring fees.
     *
     * Separate on purpose: the two are different products sold to different
     * people, and folding them into one "revenue" number would make it
     * impossible to tell whether the business is growing from employers hiring
     * or from seekers buying coaching. A single combined figure is also the kind
     * of thing that quietly hides an upsell line that stopped selling.
     *
     * There is no company dimension here — a seeker has none — so the useful
     * cuts are by product and by day.
     */
    public function upsellSummary(Request $request)
    {
        $period = (int) min(365, max(1, (int) $request->input('days', 30)));
        $since = now()->subDays($period);

        $window = JobSeekerUpsell::query()
            ->where('created_at', '>=', $since)
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->when($request->filled('sku'), fn ($q) => $q->where('sku', $request->input('sku')));

        $currency = (string) config('app.currency', 'NGN');

        $collected = (int) (clone $window)->where('status', PaymentStatus::Succeeded)->sum('amount');
        $pending = (int) (clone $window)->whereIn('status', [PaymentStatus::Pending, PaymentStatus::Processing])->sum('amount');
        $settledCount = (clone $window)->where('status', PaymentStatus::Succeeded)->count();

        $byProduct = (clone $window)
            ->selectRaw('sku, count(*) as aggregate, sum(amount) as total')
            ->groupBy('sku')
            ->orderByDesc('total')
            ->get()
            ->map(function ($row) use ($currency) {
                $product = UpsellCatalogue::find($row->sku);

                return [
                    'sku' => $row->sku,
                    'product' => $product['name'] ?? $row->sku,
                    'sold' => (int) $row->aggregate,
                    'amount' => (int) $row->total,
                    'formatted_amount' => $this->hiringFees->format((int) $row->total, $currency),
                ];
            });

        $trend = JobSeekerUpsell::query()
            ->where('status', PaymentStatus::Succeeded)
            ->where('paid_at', '>=', $since)
            ->selectRaw('DATE(paid_at) as day, count(*) as sold, sum(amount) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($row) => [
                'day' => $row->day,
                'sold' => (int) $row->sold,
                'amount' => (int) $row->total,
            ]);

        // Offers that were accepted but never bought anything: the size of the
        // audience the upsell is failing to convert.
        $hired = Application::where('status', ApplicationStatus::Hired)->count();
        $converted = JobSeekerUpsell::query()->distinct('user_id')->count();

        return $this->success([
            'period_days' => $period,
            'currency' => $currency,
            'total' => (clone $window)->count(),
            'collected' => $collected,
            'collected_formatted' => $this->hiringFees->format($collected, $currency),
            'pending' => $pending,
            'pending_formatted' => $this->hiringFees->format($pending, $currency),
            'average_order' => $settledCount > 0 ? (int) round($collected / $settledCount) : 0,
            'buyers' => $converted,
            'hires_total' => $hired,
            'by_product' => $byProduct,
            'trend' => $trend,
        ], 'Add-on summary retrieved.');
    }

    /**
     * The placement-fee ledger. Filterable by status, employer, company, job and
     * level, with an optional CSV export for finance.
     */
    public function hiringFees(Request $request)
    {
        $query = HiringFee::query()
            ->with(['employer:id,name,email', 'company:id,name', 'job:id,title', 'application.seeker:id,name', 'payment:id,reference'])
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->when($request->filled('level'), fn ($q) => $q->whereIn('level', explode(',', $request->input('level'))))
            ->when($request->filled('employer_id'), fn ($q) => $q->where('employer_id', $request->input('employer_id')))
            ->when($request->filled('company_id'), fn ($q) => $q->where('company_id', $request->input('company_id')))
            ->when($request->filled('job_id'), fn ($q) => $q->where('job_id', $request->input('job_id')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->input('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('reference', 'like', $term)
                        ->orWhereHas('employer', fn ($e) => $e->where('name', 'like', $term)->orWhere('email', 'like', $term))
                        ->orWhereHas('job', fn ($j) => $j->where('title', 'like', $term));
                });
            })
            ->when($request->filled('from'), fn ($q) => $q->where('created_at', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($q) => $q->where('created_at', '<=', $request->input('to')))
            ->orderByDesc('id');

        if ($request->boolean('export')) {
            return $this->hiringFeeCsv($query->limit(5000)->get());
        }

        $perPage = min(100, max(1, (int) $request->input('per_page', 25)));
        $paginator = $query->paginate($perPage);
        $paginator->appends($request->query());

        return $this->success(
            AdminHiringFeeResource::collection($paginator->items()),
            'Hiring fees retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    /**
     * The configurable tiers, in display order.
     *
     * Every level always has a row — the seeder creates them and deactivating one
     * is preferred over deleting it, so a hire priced earlier keeps the level it
     * was quoted at.
     */
    public function hiringFeeRates(Request $request)
    {
        $rates = HiringFeeRate::query()
            ->with('category:id,name,slug')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (HiringFeeRate $rate) => $this->hiringFeeRatePayload($rate));

        return $this->success($rates, 'Hiring fee rates retrieved.');
    }

    public function updateHiringFeeRate(Request $request, HiringFeeRate $hiringFeeRate)
    {
        $validated = $request->validate([
            'flat_amount' => ['sometimes', 'integer', 'min:0', 'max:99999999999'],
            'percentage_override' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'use_greater_of' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        // A rate with neither a flat amount nor a percentage cannot price
        // anything, so reject it here rather than letting a live hire quote 0.
        $flat = $validated['flat_amount'] ?? $hiringFeeRate->flat_amount;
        $percentage = array_key_exists('percentage_override', $validated)
            ? $validated['percentage_override']
            : $hiringFeeRate->percentage_override;

        if ((int) $flat === 0 && $percentage === null) {
            return $this->error('A rate needs either a flat amount or a percentage.', 422, [
                'flat_amount' => ['Set a flat amount, a percentage, or both.'],
            ]);
        }

        $hiringFeeRate->fill($validated)->save();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'hiring_fee_rate.updated',
            'description' => 'Updated '.$hiringFeeRate->level?->label().' hiring fee rate.',
            'properties' => $validated,
        ]);

        return $this->success($this->hiringFeeRatePayload($hiringFeeRate->refresh()), 'Hiring fee rate updated.');
    }

    /**
     * Create a category-specific override. Only meaningful when a category
     * actually exists, which is what makes it an override rather than a
     * duplicate of the global tier.
     */
    public function storeHiringFeeRate(Request $request)
    {
        $validated = $request->validate([
            'level' => ['required', 'string', Rule::in(array_column(HiringFeeLevel::cases(), 'value'))],
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')],
            'flat_amount' => ['sometimes', 'integer', 'min:0', 'max:99999999999'],
            'percentage_override' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'use_greater_of' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        $exists = HiringFeeRate::where('level', $validated['level'])
            ->where('category_id', $validated['category_id'])
            ->exists();

        if ($exists) {
            return $this->error('A rate for that level and category already exists.', 409);
        }

        $rate = HiringFeeRate::create($validated + ['currency' => $this->hiringFees->currency()]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'hiring_fee_rate.created',
            'description' => 'Created a '.$rate->level?->label().' hiring fee rate for a category.',
            'properties' => ['level' => $rate->level?->value, 'category_id' => $rate->category_id],
        ]);

        return $this->success($this->hiringFeeRatePayload($rate), 'Hiring fee rate created.', 201);
    }

    public function deleteHiringFeeRate(Request $request, HiringFeeRate $hiringFeeRate)
    {
        if ($hiringFeeRate->hiringFees()->exists()) {
            return $this->error('This rate has already priced a hire and cannot be deleted. Deactivate it instead.', 409);
        }

        $hiringFeeRate->delete();

        return $this->success(null, 'Hiring fee rate deleted.');
    }

    /**
     * Rate shape shared by the read and write endpoints, so the admin form and
     * the summary always label and scale a tier the same way.
     */
    private function hiringFeeRatePayload(HiringFeeRate $rate): array
    {
        $currency = $rate->currency ?? $this->hiringFees->currency();

        return [
            'id' => $rate->id,
            'level' => $rate->level?->value,
            'level_label' => $rate->level?->label(),
            'category_id' => $rate->category_id,
            'category' => $rate->category?->name,
            'scope' => $rate->category_id ? 'category' : 'default',
            'flat_amount' => $rate->flat_amount,
            'flat_amount_formatted' => $this->hiringFees->format($rate->flat_amount, $currency),
            'percentage_override' => $rate->percentage_override,
            'percentage' => $rate->percentage(),
            'use_greater_of' => $rate->use_greater_of,
            'is_active' => $rate->is_active,
            'sort_order' => $rate->sort_order,
            'currency' => $currency,
            'fees_charged' => $rate->hiringFees()->count(),
        ];
    }

    /**
     * CSV of the current filter. Built from the resource so a column can never
     * drift from what the screen shows.
     */
    private function hiringFeeCsv($fees)
    {
        $headers = [
            'reference', 'paid_at', 'employer', 'company', 'job', 'candidate',
            'level', 'status', 'currency', 'amount',
        ];

        $rows = $fees->map(fn ($fee) => [
            $fee->reference,
            $fee->paid_at?->format('Y-m-d H:i:s'),
            $fee->employer?->name,
            $fee->company?->name,
            $fee->job?->title,
            $fee->application?->seeker?->name,
            $fee->level?->value,
            $fee->status?->value,
            $fee->currency,
            number_format($fee->amount / 100, 2, '.', ''),
        ])->all();

        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, 'hirehub-hiring-fees-'.now()->format('Y-m-d').'.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function skills(Request $request)
    {
        $skillCounts = [];
        $profileSkills = Profile::whereNotNull('skills')->pluck('skills');

        foreach ($profileSkills as $skills) {
            foreach ((array) $skills as $skill) {
                if (is_string($skill) && trim($skill) !== '') {
                    $key = Str::lower(trim($skill));
                    $skillCounts[$key] = ($skillCounts[$key] ?? 0) + 1;
                }
            }
        }

        $jobTags = Job::whereNotNull('tags')->pluck('tags');
        foreach ($jobTags as $tags) {
            foreach ((array) $tags as $tag) {
                if (is_string($tag) && trim($tag) !== '') {
                    $key = Str::lower(trim($tag));
                    $skillCounts[$key] = ($skillCounts[$key] ?? 0) + 1;
                }
            }
        }

        $skills = collect($skillCounts)->sortDesc()->take(100)->map(fn ($count, $name) => [
            'name' => $name,
            'count' => $count,
        ])->values();

        return $this->success($skills, 'Skills retrieved.');
    }

    public function reports(Request $request)
    {
        $now = now();
        $start = $now->copy()->subDays(30);

        $jobsByStatus = Job::whereBetween('created_at', [$start, $now])->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $appsByStatus = Application::whereBetween('applied_at', [$start, $now])->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        $hourly = Application::whereBetween('applied_at', [$start, $now])
            ->selectRaw($this->dateBucketExpression('applied_at').' as day, count(*) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        return $this->success([
            'range' => ['from' => $start->toIso8601String(), 'to' => $now->toIso8601String()],
            'new_users' => User::whereBetween('created_at', [$start, $now])->count(),
            'new_jobs' => Job::whereBetween('created_at', [$start, $now])->count(),
            'new_applications' => Application::whereBetween('applied_at', [$start, $now])->count(),
            'jobs_by_status' => $jobsByStatus,
            'applications_by_status' => $appsByStatus,
            'applications_by_day' => $hourly->map(fn ($row) => ['date' => $row->day, 'value' => (int) $row->total]),
            'top_companies' => Company::withCount('jobs')->orderByDesc('jobs_count')->limit(5)->get()->map(fn (Company $company) => [
                'name' => $company->name,
                'jobs_count' => $company->jobs_count,
                'verified' => (bool) $company->is_verified,
            ]),
        ], 'Reports retrieved.');
    }

    /**
     * SQL expression that truncates a timestamp column to a Y-m-d day bucket.
     *
     * There is no portable raw-SQL way to do this, so the expression is chosen
     * per driver. MySQL is the production target; the SQLite branch keeps the
     * feature test suite (which runs on in-memory SQLite) exercising the same
     * code path instead of skipping it.
     */
    private function dateBucketExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m-%d', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM-DD')",
            default => "DATE_FORMAT({$column}, '%Y-%m-%d')",
        };
    }

    public function __construct(
        protected HiringFeeService $hiringFees,
    ) {}

    public function activityLogs(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = ActivityLog::with('user:id,name')
            ->when($request->filled('action'), fn ($q) => $q->where('action', 'like', '%'.$request->input('action').'%'))
            ->when($request->filled('level'), fn ($q) => $q->where('level', $request->input('level')))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->success(
            $paginator->map(fn (ActivityLog $log) => [
                'id' => $log->id,
                'actor' => $log->actor_name ?? $log->user?->name ?? 'System',
                'action' => $log->action,
                'target' => $log->target_name,
                'level' => $log->level,
                'ip' => $log->ip_address,
                'time' => $log->created_at?->diffForHumans(),
                'created_at' => $log->created_at?->toIso8601String(),
            ])->values(),
            'Activity logs retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function settings(Request $request)
    {
        $settings = Setting::all()->groupBy('group');

        return $this->success($settings->map(fn ($items, $group) => $items->mapWithKeys(fn (Setting $setting) => [
            $setting->key => $setting->value,
        ])), 'Settings retrieved.');
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable'],
        ]);

        foreach ($validated['settings'] as $group => $entries) {
            foreach ((array) $entries as $key => $value) {
                Setting::updateOrCreate(
                    ['group' => (string) $group, 'key' => (string) $key],
                    ['value' => is_array($value) ? $value : (is_bool($value) ? $value : (is_scalar($value) ? (string) $value : $value))],
                );
            }
        }

        return $this->success(null, 'Settings updated.');
    }
}
