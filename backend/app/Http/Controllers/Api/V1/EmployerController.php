<?php

namespace App\Http\Controllers\Api\V1;

use App\Billing\Exceptions\PlanLimitReached;
use App\Billing\PlanEntitlements;
use App\Enums\ApplicationStatus;
use App\Enums\PaymentGateway;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\AdminJobResource;
use App\Http\Resources\V1\ApplicationResource;
use App\Http\Resources\V1\CompanyResource;
use App\Http\Resources\V1\HiringFeeResource;
use App\Http\Resources\V1\NotificationResource;
use App\Models\ActivityLog;
use App\Models\Application;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Services\HiringFeeService;
use App\Support\Notifier;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use RuntimeException;

class EmployerController extends ApiController
{
    private const JOB_STATUSES = ['open', 'closed', 'draft', 'pending', 'flagged', 'expired'];

    private const APP_STATUSES = ['new', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];

    public function __construct(
        protected PlanEntitlements $entitlements,
        protected HiringFeeService $hiringFees,
    ) {}

    private function companyOrFail(Request $request): Company
    {
        $company = $request->user()->company;

        if (! $company) {
            abort(response()->json(['success' => false, 'message' => 'Complete your company profile first.', 'errors' => ['No company attached to this account.']], 422));
        }

        return $company;
    }

    /**
     * The company's live plan and usage, resolved from the database.
     *
     * Read on demand rather than cached, so the dashboard card, the sidebar
     * counter and the paywall always quote the rows as they stand right now.
     */
    public function usage(Request $request)
    {
        return $this->success(
            $this->entitlements->forCompany($this->companyOrFail($request))->toArray(),
            'Plan usage retrieved.'
        );
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
            // Carried in the dashboard payload itself so the plan card and the
            // header counters render from the same response as the stats, and
            // cannot disagree with them.
            'plan' => $this->entitlements->forCompany($company)->toArray(),
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

        // The limit is decided from the database before anything is written.
        // This is the whole point of the check living here rather than in the
        // form: hiding the button, or trusting a count the client sent, would
        // both be trivially bypassed by calling this endpoint directly.
        $entitlement = $this->entitlements->forCompany($company);

        if (! $entitlement->canPostJob()) {
            throw new PlanLimitReached(
                entitlement: $entitlement,
                resource: 'job_post',
                message: $entitlement->isPaid()
                    ? "You have used all {$entitlement->plan->job_post_limit} job posts included in your {$entitlement->plan->name} plan. Delete a job or upgrade to post another."
                    : "The free plan includes {$entitlement->plan->job_post_limit} job post. Upgrade to post more jobs.",
            );
        }

        $validated = $this->validateJobPayload($request);

        $baseSlug = Str::slug($validated['title']);
        $slug = $baseSlug;
        $counter = 2;
        while (Job::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$counter++;
        }

        $job = DB::transaction(function () use ($validated, $company, $request, $slug) {
            $job = Job::create([
                ...$this->jobAttributes($validated),
                'company_id' => $company->id,
                'user_id' => $request->user()->id,
                'slug' => $slug,
                'status' => $validated['status'] ?? 'draft',
                'posted_at' => now(),
                'expires_at' => $request->date('deadline') ?? now()->addDays(60),
            ]);

            ActivityLog::record($request->user(), 'job.created', $job, request: $request);

            return $job;
        });

        return $this->success([
            'job' => new AdminJobResource($job->load(['company', 'category'])),
            // Returned with every write so the caller can update its counters
            // from the response instead of refetching, and so the figure shown
            // is the one that was true immediately after the insert.
            'plan' => $this->entitlements->forCompany($company)->toArray(),
        ], 'Job created.', 201);
    }

    public function updateJob(Request $request, Job $job)
    {
        $this->authorize('update', $job);

        $validated = $this->validateJobPayload($request, partial: true);

        DB::transaction(function () use ($job, $validated, $request) {
            $job->fill($this->jobAttributes($validated));

            // The slug is minted once at creation and deliberately left alone
            // here. It is the job's public identifier: renaming it on every
            // title edit would break shared links, bookmarks and any client
            // still holding the previous slug.
            $job->save();

            ActivityLog::record($request->user(), 'job.updated', $job, request: $request);
        });

        return $this->success(new AdminJobResource($job->load(['company', 'category'])), 'Job updated.');
    }

    /**
     * Shared validation for job create/update so both entry points stay in sync.
     */
    private function validateJobPayload(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        $validated = $request->validate([
            'title' => [$required, 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:120'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'location' => ['nullable', 'string', 'max:255'],
            'workplace' => [$required, 'string', 'in:on-site,remote,hybrid'],
            'employment_type' => [$required, 'string', 'in:full-time,part-time,contract,internship'],
            'level' => ['nullable', 'string', 'max:255'],
            'salary_min' => ['nullable', 'numeric', 'gte:0'],
            'salary_max' => ['nullable', 'numeric', 'gte:0', 'gte:salary_min'],
            'salary_currency' => ['nullable', 'string', 'max:10'],
            'salary_period' => ['nullable', 'string', 'max:20'],
            'description' => [$required, 'string'],
            'responsibilities' => ['nullable', 'array'],
            'responsibilities.*' => ['string', 'max:1000'],
            'requirements' => ['nullable', 'array'],
            'requirements.*' => ['string', 'max:1000'],
            'benefits' => ['nullable', 'array'],
            'benefits.*' => ['string', 'max:1000'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:60'],
            'deadline' => ['nullable', 'date', 'after:today'],
            'status' => ['nullable', 'string', Rule::in(self::JOB_STATUSES)],
        ]);

        // The caller passes 'deadline' straight through to expires_at; it is not
        // a column, so drop it before the payload reaches the model.
        unset($validated['deadline']);

        return $validated;
    }

    /**
     * Map the validated payload onto persisted job columns, resolving the
     * category name supplied by the employer form into a category_id.
     *
     * @return array<string, mixed>
     */
    private function jobAttributes(array $validated): array
    {
        $attributes = Arr::except($validated, ['category', 'status']);

        if (array_key_exists('category_id', $validated) || array_key_exists('category', $validated)) {
            $attributes['category_id'] = $this->resolveCategoryId($validated);
        }

        return $attributes;
    }

    private function resolveCategoryId(array $validated): ?int
    {
        if (! empty($validated['category_id'])) {
            return (int) $validated['category_id'];
        }

        $name = trim((string) ($validated['category'] ?? ''));

        if ($name === '') {
            return null;
        }

        $slug = Str::slug($name);

        return Category::firstOrCreate(
            ['slug' => $slug],
            ['name' => $name, 'status' => 'active', 'sort_order' => 0]
        )->id;
    }

    public function updateJobStatus(Request $request, Job $job)
    {
        $this->authorize('updateStatus', $job);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(self::JOB_STATUSES)],
        ]);

        $job->update(['status' => $validated['status']]);

        return $this->success(new AdminJobResource($job->load('company')), 'Job status updated.');
    }

    /**
     * Spend or release a featured slot on one of the company's own jobs.
     *
     * `is_featured` is not fillable, so it can never be set by mass assignment
     * from a request body anywhere in the app; this endpoint is the single
     * employer-facing path to it and it charges a credit for every job it
     * promotes. Un-featuring releases the credit immediately, so an employer
     * who promotes the wrong job is not left out of pocket.
     */
    public function featureJob(Request $request, Job $job)
    {
        $this->authorize('update', $job);

        $validated = $request->validate([
            'featured' => ['required', 'boolean'],
        ]);

        $company = $this->companyOrFail($request);
        $entitlement = $this->entitlements->forCompany($company);
        $wants = (bool) $validated['featured'];

        // Promoting a job that is already featured, or demoting one that is
        // not, is a no-op rather than an error, so a double-click or a stale
        // view cannot burn a credit.
        if ($wants !== $job->is_featured) {
            if ($wants && ! $entitlement->canFeatureJob()) {
                throw new PlanLimitReached(
                    entitlement: $entitlement,
                    resource: 'featured_job',
                    message: $entitlement->isPaid()
                        ? "You have used all {$entitlement->plan->featured_job_limit} featured job slots on your {$entitlement->plan->name} plan. Un-feature a job or upgrade to promote another."
                        : 'Featuring a job is not included on the free plan. Upgrade to promote jobs to the top of search results.',
                );
            }

            $job->forceFill(['is_featured' => $wants])->save();

            ActivityLog::record($request->user(), $wants ? 'job.featured' : 'job.unfeatured', $job, request: $request);
        }

        return $this->success([
            'job' => new AdminJobResource($job->fresh()->load(['company', 'category'])),
            'plan' => $this->entitlements->forCompany($company)->toArray(),
        ], $wants ? 'Job featured.' : 'Featured slot released.');
    }

    public function deleteJob(Request $request, Job $job)
    {
        $this->authorize('delete', $job);

        $job->delete();

        return $this->success([
            'plan' => $this->entitlements->forCompany($this->companyOrFail($request))->toArray(),
        ], 'Job deleted.');
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
        $this->authorize('view', $application);

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
        $this->authorize('updateStatus', $application);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(self::APP_STATUSES)],
        ]);

        $target = ApplicationStatus::from($validated['status']);

        // A hire is a paid transaction, not a status change. The client is never
        // trusted to have gone through checkout: the only thing that unlocks
        // this transition is a hiring_fees row for *this* application whose
        // status is `succeeded`, which only a verified gateway webhook (or an
        // out-of-band reconcile against the provider) can set. Reached here the
        // request is refused and the application keeps whatever status it had.
        if ($target === ApplicationStatus::Hired && ! $this->hiringFees->hasSettledHire($application)) {
            return $this->error(
                'Confirm and pay the hiring fee to complete this hire.',
                402,
                null,
                [
                    'hiring_fee' => $this->hiringFees->preview($application),
                    // Where the client sends the employer to pay. Additive so
                    // this can be attached to any future refusal shape without
                    // changing the envelope's meaning.
                    'checkout_endpoint' => "/api/v1/employer/applicants/{$application->id}/hiring-fee/checkout",
                ],
                'hiring_fee_required'
            );
        }

        DB::transaction(function () use ($application, $validated) {
            $application->update(['status' => $validated['status']]);
        });

        Notifier::send($application->seeker, [
            'category' => 'applications',
            'type' => 'status',
            'icon' => 'bi-arrow-repeat',
            'text' => 'Your application for '.$application->job?->title.' is now '.($application->status?->label() ?? $validated['status']).'.',
            'action' => 'View application',
            'link' => '/seeker/applications',
            'subject' => 'Application update — '.$application->job?->title,
        ]);

        return $this->success(new ApplicationResource($application->load(['job.company', 'seeker.profile'])), 'Application status updated.');
    }

    /*
    |--------------------------------------------------------------------------
    | Hiring fee
    |--------------------------------------------------------------------------
    */

    /**
     * Price the hire for the confirmation modal.
     *
     * Read-only and safe to call repeatedly. Everything it returns is computed on
     * the server from `hiring_fee_rates`; the browser has no way to influence
     * the amount, only to display it.
     */
    public function hiringFeeQuote(Request $request, Application $application)
    {
        $this->authorize('updateStatus', $application);

        try {
            return $this->success($this->hiringFees->preview($application), 'Hiring fee calculated.');
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422, null, null, 'hiring_fee_unavailable');
        }
    }

    /**
     * Open the gateway checkout that pays the fee.
     *
     * Nothing about the application changes here. The hire only completes when
     * the gateway's signed webhook comes back, which is handled by
     * PaymentService — never by the fact that this call returned a URL.
     */
    public function createHiringFeeCheckout(Request $request, Application $application)
    {
        $this->authorize('updateStatus', $application);

        $data = $request->validate([
            'gateway' => ['nullable', 'string', Rule::in(array_column(PaymentGateway::cases(), 'value'))],
        ]);

        try {
            $result = $this->hiringFees->initialize($application, $request->user(), $data['gateway'] ?? null);
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422, null, null, 'hiring_fee_unavailable');
        } catch (RuntimeException $e) {
            return $this->error($e->getMessage(), 502, null, null, 'gateway_error');
        }

        return $this->success([
            'hiring_fee' => new HiringFeeResource($result['hiring_fee']),
            'checkout_url' => $result['checkout_url'],
            'reference' => $result['hiring_fee']->reference,
        ], 'Checkout created. Complete the payment to confirm the hire.', 201);
    }

    /**
     * Current state of the fee for one application, reconciled against the
     * gateway if the webhook has not landed yet.
     *
     * This is what the applicant page calls when the employer returns from
     * checkout, so the "Paid" confirmation appears without waiting for a
     * webhook round-trip. The browser cannot assert success here: the amount
     * and currency are re-checked against the provider's own answer.
     */
    public function hiringFeeStatus(Request $request, Application $application)
    {
        $this->authorize('view', $application);

        $fee = $application->hiringFee()->with('payment')->latest('id')->first();

        if (! $fee) {
            return $this->success([
                'hiring_fee' => null,
                'application_status' => $application->status?->value,
                'hired' => false,
            ], 'No hiring fee has been raised for this application.');
        }

        $fee = $this->hiringFees->reconcile($fee);
        $application->refresh();

        return $this->success([
            'hiring_fee' => new HiringFeeResource($fee),
            'application_status' => $application->status?->value,
            'hired' => $application->status === ApplicationStatus::Hired,
        ], $fee->isSettled() ? 'Hiring fee paid — this candidate is hired.' : 'Hiring fee is not yet settled.');
    }

    /**
     * The employer's own placement-fee history.
     */
    public function hiringFees(Request $request)
    {
        $company = $this->companyOrFail($request);
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = $company->hiringFees()
            ->with(['job:id,title', 'application.seeker:id,name'])
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->orderByDesc('id')
            ->paginate($perPage);

        return $this->success(
            HiringFeeResource::collection($paginator->items()),
            'Hiring fees retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function downloadCv(Request $request, Application $application)
    {
        $this->authorize('downloadCv', $application);

        $company = $this->companyOrFail($request);

        // The monthly CV allowance is spent by opening a CV, so it is checked
        // before the file is streamed. The count is written to the activity log
        // first and the download served after, so a view that was refused can
        // never be re-attempted for free.
        $entitlement = $this->entitlements->forCompany($company);

        if (! $entitlement->canViewCv()) {
            throw new PlanLimitReached(
                entitlement: $entitlement,
                resource: 'cv_view',
                message: $entitlement->isPaid()
                    ? "You have used all {$entitlement->plan->cv_view_limit} CV views on your {$entitlement->plan->name} plan this month. Your allowance resets at the start of next month, or upgrade for more."
                    : "The free plan includes {$entitlement->plan->cv_view_limit} CV views per month. Upgrade for more.",
            );
        }

        $cvPath = $application->cv_path ?? $application->seeker?->profile?->cv_path;

        if (! $cvPath || ! Storage::disk('local')->exists($cvPath)) {
            return $this->error('This candidate has not uploaded a CV.', 404);
        }

        ActivityLog::record($request->user(), PlanEntitlements::CV_VIEW_ACTION, $application, request: $request);

        $seeker = $application->seeker;
        $filename = Str::slug(($seeker?->name ?? 'candidate').'-cv').'.'.pathinfo($cvPath, PATHINFO_EXTENSION);

        return Storage::disk('local')->download($cvPath, $filename);
    }

    /**
     * Hiring analytics for the company's own jobs.
     *
     * Gated by the `plan:analytics` middleware, which rejects the request with
     * `plan_upgrade_required` for plans that do not grant it. Everything below
     * is aggregated from the company's own applications and jobs.
     */
    public function analytics(Request $request)
    {
        $company = $this->companyOrFail($request);
        $months = min(24, max(3, (int) $request->input('months', 6)));

        $jobIds = Job::query()->where('company_id', $company->id)->pluck('id');

        $applications = Application::query()->whereIn('job_id', $jobIds);

        $funnel = [];
        foreach (['new', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired'] as $status) {
            $funnel[] = ['status' => $status, 'value' => (clone $applications)->where('status', $status)->count()];
        }

        $rejected = (clone $applications)->where('status', 'rejected')->count();
        $total = (clone $applications)->count();
        $hired = (clone $applications)->where('status', 'hired')->count();

        $trend = [];
        foreach (CarbonPeriod::create(now()->subMonths($months - 1)->startOfMonth(), '1 month', now()->startOfMonth()) as $period) {
            $trend[] = [
                'label' => $period->format('M Y'),
                'value' => (clone $applications)
                    ->whereYear('applied_at', $period->year)
                    ->whereMonth('applied_at', $period->month)
                    ->count(),
            ];
        }

        // Median days to hire, from the applications that were actually hired.
        // Computed over the hired set only, so a single long-tenured vacancy
        // does not distort the headline number.
        $daysToHire = (clone $applications)
            ->whereNotNull('status_changed_at')
            ->where('status', 'hired')
            ->get(['applied_at', 'status_changed_at'])
            ->map(fn (Application $a) => $a->applied_at?->diffInDays($a->status_changed_at))
            ->filter()
            ->sort()
            ->values();

        $median = $daysToHire->isEmpty()
            ? null
            // The middle value, not the last: indexing by count-1 yields the
            // slowest hire to close, which would be reported as the "median"
            // and would swing wildly with a single outlier. An even-sized
            // sample has two middles, so the true median is their mean.
            : $this->medianOf($daysToHire);

        $topJobs = Job::query()
            ->where('company_id', $company->id)
            ->withCount('applications')
            ->orderByDesc('applications_count')
            ->limit(5)
            ->get(['id', 'title', 'slug', 'status', 'view_count', 'applications_count']);

        return $this->success([
            'totals' => [
                'jobs' => Job::query()->where('company_id', $company->id)->count(),
                'open_jobs' => Job::query()->where('company_id', $company->id)->where('status', 'open')->count(),
                'applications' => $total,
                'hired' => $hired,
                'rejected' => $rejected,
                'hire_rate' => $total > 0 ? round(($hired / $total) * 100, 1) : 0.0,
                'median_days_to_hire' => $median,
                'total_job_views' => (int) Job::query()->where('company_id', $company->id)->sum('view_count'),
            ],
            'funnel' => $funnel,
            'applications_trend' => $trend,
            'top_jobs' => $topJobs,
            'plan' => $this->entitlements->forCompany($company)->toArray(),
        ], 'Analytics retrieved.');
    }

    /**
     * Median of an ascending, non-empty list of integers.
     *
     * @param  Collection<int, int>  $sorted
     */
    private function medianOf($sorted): int
    {
        $count = $sorted->count();
        $middle = intdiv($count, 2);

        // Odd count: the single middle element. Even: the mean of the two.
        return $count % 2 === 1
            ? (int) $sorted->get($middle)
            : (int) round(($sorted->get($middle - 1) + $sorted->get($middle)) / 2);
    }

    public function company(Request $request)
    {
        $company = $this->companyOrFail($request);

        return $this->success(new CompanyResource($company), 'Company retrieved.');
    }

    public function updateCompany(Request $request)
    {
        $company = $this->companyOrFail($request);
        $this->authorize('update', $company);

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
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $user = $request->user();

        // The unread count is a separate query because it must reflect every
        // unread notification, not just the ones on the current page.
        $paginator = $user->notifications()
            ->when($request->filled('category'), fn ($q) => $q->where('data->category', $request->input('category')))
            ->when($request->boolean('unread'), fn ($q) => $q->unread())
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->success([
            'notifications' => NotificationResource::collection($paginator->items()),
            'unread_count' => $user->unreadNotifications()->count(),
        ], 'Notifications retrieved.', 200, [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
        ]);
    }

    /**
     * Employers get the same per-notification read receipt as seekers.
     *
     * Scoped through the user's own notifications() relation, so a guessed id
     * belonging to somebody else simply 404s instead of being marked.
     */
    public function markNotificationRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return $this->success(null, 'Notification marked as read.');
    }

    public function markAllNotificationsRead(Request $request)
    {
        // Scoped to the caller's own unread notifications, so this can never
        // touch another account's rows.
        $count = $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return $this->success(['marked' => $count], 'All notifications marked as read.');
    }
}
