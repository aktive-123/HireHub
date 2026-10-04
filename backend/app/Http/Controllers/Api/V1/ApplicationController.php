<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\ApplicationResource;
use App\Models\Application;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ApplicationController extends ApiController
{
    private const STATUSES = ['new', 'reviewing', 'shortlisted', 'interview', 'offer', 'offer_confirmed_pending_acceptance', 'hired', 'rejected', 'withdrawn'];

    /**
     * Applications are never listed globally. The query is always narrowed to
     * the caller first: seekers see their own submissions, employers see
     * applicants to their own company's jobs, and admins see everything.
     */
    public function index(Request $request)
    {
        $query = $this->scopeToCaller(Application::query(), $request)
            ->with([
                'job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified',
                'seeker:id,name,email,phone,avatar_url,profile_picture',
                'seeker.profile.experiences',
                'seeker.profile.educations',
            ]);

        if ($request->filled('job')) {
            $query->whereHas('job', fn ($job) => $job->where('slug', $request->input('job')));
        }

        if ($request->filled('status')) {
            $values = explode(',', $request->input('status'));
            $query->whereIn('status', array_intersect($values, self::STATUSES));
        }

        if ($request->filled('seeker')) {
            $query->where('seeker_id', $request->input('seeker'));
        }

        $query->orderByDesc('applied_at')->orderByDesc('id');

        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $paginator = $query->paginate($perPage)->withQueryString();

        return $this->success(
            ApplicationResource::collection($paginator->items()),
            'Applications retrieved.',
            200,
            [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'filters' => $request->only(['job', 'status', 'seeker']),
            ]
        );
    }

    public function show(Request $request, Application $application)
    {
        // Policy denies cross-tenant reads (candidate owns it, or the
        // application targets one of the employer's own jobs).
        $this->authorize('view', $application);

        $application->load([
            'job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified',
            'seeker:id,name,email,phone,avatar_url,profile_picture',
            'seeker.profile.experiences',
            'seeker.profile.educations',
        ]);

        return $this->success(new ApplicationResource($application), 'Application retrieved.');
    }

    private function scopeToCaller(Builder $query, Request $request): Builder
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return $query;
        }

        if ($user->isEmployer()) {
            $companyId = $user->company?->id;

            return $query->whereHas('job', fn ($job) => $job->where('company_id', $companyId));
        }

        return $query->where('seeker_id', $user->id);
    }
}
