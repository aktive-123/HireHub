<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\ApplicationResource;
use App\Models\Application;
use Illuminate\Http\Request;

class ApplicationController extends ApiController
{
    private const STATUSES = ['new', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];

    public function index(Request $request)
    {
        $query = Application::query()
            ->with([
                'job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified',
                'seeker:id,name,email,phone',
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

    public function show(Application $application)
    {
        $application->load([
            'job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified',
            'seeker:id,name,email,phone',
            'seeker.profile.experiences',
            'seeker.profile.educations',
        ]);

        return $this->success(new ApplicationResource($application), 'Application retrieved.');
    }
}
