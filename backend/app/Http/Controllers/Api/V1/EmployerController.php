<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\AdminJobResource;
use App\Http\Resources\V1\ApplicationResource;
use App\Http\Resources\V1\CompanyResource;
use App\Http\Resources\V1\NotificationResource;
use App\Models\Application;
use App\Models\Company;
use App\Models\Job;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmployerController extends ApiController
{
    private const JOB_STATUSES = ['open', 'closed', 'draft', 'pending', 'flagged', 'expired'];

    private const APP_STATUSES = ['new', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];

    private function companyOrFail(Request $request): Company
    {
        $company = $request->user()->company;

        if (! $company) {
            abort(response()->json(['success' => false, 'message' => 'Complete your company profile first.', 'errors' => ['No company attached to this account.']], 422));
        }

        return $company;
    }

    public function dashboard(Request $request)
    {
        $company = $this->companyOrFail($request);
        $jobs = Job::where('company_id', $company->id)->get();
        $activeJobs = $jobs->where('status', 'open');
        $jobIds = $jobs->pluck('id');

        $applications = Application::whereIn('job_id', $jobIds);
        $appStatusCounts = (clone $applications)->get()->groupBy('status')->map->count();
        $monthly = [];

        foreach (CarbonPeriod::create(now()->subMonths(8)->startOfMonth(), '1 month', now()->startOfMonth()) as $period) {
            $monthly[] = [
                'label' => $period->format('M'),
                'value' => (clone $applications)->whereYear('applied_at', $period->year)->whereMonth('applied_at', $period->month)->count(),
            ];
        }

        return $this->success([
            'stats' => [
                ['key' => 'jobs', 'label' => 'Total jobs', 'value' => $jobs->count(), 'tone' => 'primary'],
                ['key' => 'active_jobs', 'label' => 'Active jobs', 'value' => $activeJobs->count(), 'tone' => 'info'],
                ['key' => 'applications', 'label' => 'Applications', 'value' => (clone $applications)->count(), 'tone' => 'warning'],
                ['key' => 'hired', 'label' => 'Hired', 'value' => $appStatusCounts['hired'] ?? 0, 'tone' => 'success'],
            ],
            'applications_this_month' => (clone $applications)->whereBetween('applied_at', [now()->startOfMonth(), now()->endOfMonth()])->count(),
            'applications_by_month' => $monthly,
        ], 'Dashboard retrieved.');
    }

    public function jobs(Request $request)
    {
        $company = $this->companyOrFail($request);
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = Job::where('company_id', $company->id)
            ->with('category:id,slug,name,icon')
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->success(
            AdminJobResource::collection($paginator->items()),
            'Jobs retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function storeJob(Request $request)
    {
        $company = $this->companyOrFail($request);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'workplace' => ['required', 'string', 'in:on-site,remote,hybrid'],
            'employment_type' => ['required', 'string', 'in:full-time,part-time,contract,internship'],
            'level' => ['nullable', 'string', 'max:255'],
            'salary_min' => ['nullable', 'numeric', 'gte:0'],
            'salary_max' => ['nullable', 'numeric', 'gte:0'],
            'salary_currency' => ['nullable', 'string', 'max:10'],
            'salary_period' => ['nullable', 'string', 'max:20'],
            'description' => ['required', 'string'],
            'responsibilities' => ['nullable', 'array'],
            'requirements' => ['nullable', 'array'],
            'benefits' => ['nullable', 'array'],
            'tags' => ['nullable', 'array', 'max:20'],
            'deadline' => ['nullable', 'date'],
            'status' => ['nullable', 'string', Rule::in(self::JOB_STATUSES)],
        ]);

        unset($validated['category'], $validated['deadline']);

        $baseSlug = Str::slug($validated['title']);
        $slug = $baseSlug;
        $counter = 2;
        while (Job::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$counter++;
        }

        $job = Job::create($validated + [
            'company_id' => $company->id,
            'user_id' => $request->user()->id,
            'category_id' => null,
            'slug' => $slug,
            'status' => $request->input('status', 'draft'),
            'posted_at' => now(),
            'expires_at' => $request->date('deadline') ?? now()->addDays(60),
        ]);

        return $this->success(new AdminJobResource($job->load('company')), 'Job created.', 201);
    }

    public function updateJob(Request $request, Job $job)
    {
        $company = $this->companyOrFail($request);
        abort_if($job->company_id !== $company->id, 403);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'workplace' => ['sometimes', 'string', 'in:on-site,remote,hybrid'],
            'employment_type' => ['sometimes', 'string', 'in:full-time,part-time,contract,internship'],
            'level' => ['nullable', 'string', 'max:255'],
            'salary_min' => ['nullable', 'numeric', 'gte:0'],
            'salary_max' => ['nullable', 'numeric', 'gte:0'],
            'description' => ['sometimes', 'string'],
            'responsibilities' => ['nullable', 'array'],
            'requirements' => ['nullable', 'array'],
            'benefits' => ['nullable', 'array'],
            'tags' => ['nullable', 'array', 'max:20'],
        ]);

        $job->fill($validated);
        if (isset($validated['title'])) {
            $job->slug = Str::slug($validated['title']).'-'.$job->id;
        }
        $job->save();

        return $this->success(new AdminJobResource($job->load('company')), 'Job updated.');
    }

    public function updateJobStatus(Request $request, Job $job)
    {
        $company = $this->companyOrFail($request);
        abort_if($job->company_id !== $company->id, 403);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(self::JOB_STATUSES)],
        ]);

        $job->update(['status' => $validated['status']]);

        return $this->success(new AdminJobResource($job->load('company')), 'Job status updated.');
    }

    public function deleteJob(Request $request, Job $job)
    {
        $company = $this->companyOrFail($request);
        abort_if($job->company_id !== $company->id, 403);

        $job->delete();

        return $this->success(null, 'Job deleted.');
    }

    public function applicants(Request $request)
    {
        $company = $this->companyOrFail($request);
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = Application::whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->with(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone', 'seeker.profile.experiences', 'seeker.profile.educations'])
            ->orderByDesc('applied_at')
            ->paginate($perPage);

        return $this->success(
            ApplicationResource::collection($paginator->items()),
            'Applicants retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function applicant(Request $request, Application $application)
    {
        $company = $this->companyOrFail($request);
        abort_if($application->job->company_id !== $company->id, 403);

        $application->load([
            'job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified',
            'seeker:id,name,email,phone',
            'seeker.profile.experiences',
            'seeker.profile.educations',
        ]);

        return $this->success(new ApplicationResource($application), 'Applicant retrieved.');
    }

    public function updateApplicationStatus(Request $request, Application $application)
    {
        $company = $this->companyOrFail($request);
        abort_if($application->job->company_id !== $company->id, 403);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(self::APP_STATUSES)],
        ]);

        $application->update(['status' => $validated['status']]);

        return $this->success(new ApplicationResource($application->load(['job.company', 'seeker.profile'])), 'Application status updated.');
    }

    public function company(Request $request)
    {
        $company = $this->companyOrFail($request);

        return $this->success(new CompanyResource($company), 'Company retrieved.');
    }

    public function updateCompany(Request $request)
    {
        $company = $this->companyOrFail($request);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'size' => ['nullable', 'string', 'max:255'],
            'founded' => ['nullable', 'integer', 'between:1600,2100'],
            'website' => ['nullable', 'url', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        if (isset($validated['name'])) {
            $company->name = $validated['name'];
            $company->slug = Str::slug($validated['name']).'-'.$company->id;
        }
        $company->fill($validated);
        $company->save();

        return $this->success(new CompanyResource($company), 'Company updated.');
    }

    public function notifications(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return $this->success([
            'notifications' => NotificationResource::collection($notifications),
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ], 'Notifications retrieved.');
    }
}
