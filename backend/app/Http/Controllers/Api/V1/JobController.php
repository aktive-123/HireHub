<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\JobResource;
use App\Models\Job;
use Illuminate\Http\Request;

class JobController extends ApiController
{
    private const SORTS = [
        'recent' => ['posted_at', 'desc'],
        'salary_asc' => ['salary_max', 'asc'],
        'salary_desc' => ['salary_max', 'desc'],
        'views' => ['view_count', 'desc'],
        'applications' => ['applications_count', 'desc'],
    ];

    public function index(Request $request)
    {
        $query = Job::query()
            ->with(['company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'category:id,slug,name,icon'])
            ->whereNull('deleted_at');

        if ($request->filled('search')) {
            $term = trim($request->input('search'));
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', "%{$term}%")
                    ->orWhere('location', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhereJsonContains('tags', $term)
                    ->orWhereHas('company', function ($company) use ($term) {
                        $company->where('name', 'like', "%{$term}%");
                    });
            });
        }

        if ($request->filled('category')) {
            $query->whereHas('category', fn ($category) => $category
                ->where('name', $request->input('category'))
                ->orWhere('slug', $request->input('category')));
        }

        if ($request->filled('location')) {
            $query->where('location', 'like', '%'.$request->input('location').'%');
        }

        if ($request->filled('tag')) {
            $query->whereJsonContains('tags', $request->input('tag'));
        }

        foreach (['workplace', 'employment_type', 'level', 'category_id'] as $field) {
            if ($request->filled($field)) {
                $values = explode(',', $request->input($field));
                $query->whereIn($field, $values);
            }
        }

        if ($request->filled('status') && ! in_array($request->input('status'), ['all', ',all'], true)) {
            $query->whereIn('status', explode(',', $request->input('status')));
        }

        if ($request->filled('featured')) {
            $query->where('is_featured', filter_var($request->input('featured'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('min_salary')) {
            $query->where('salary_max', '>=', (float) $request->input('min_salary'));
        }

        if ($request->filled('max_salary')) {
            $query->where('salary_min', '<=', (float) $request->input('max_salary'));
        }

        $sort = $request->input('sort', 'recent');
        [$column, $direction] = self::SORTS[$sort] ?? self::SORTS['recent'];
        $query->orderBy($column, $direction)->orderBy('id', 'desc');

        $perPage = min(50, max(1, (int) $request->input('per_page', 12)));
        $paginator = $query->paginate($perPage)->withQueryString();

        return $this->success(
            JobResource::collection($paginator->items()),
            'Jobs retrieved.',
            200,
            [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'open_count' => Job::whereNull('deleted_at')->where('status', 'open')->count(),
                'featured_count' => Job::whereNull('deleted_at')->where('is_featured', true)->where('status', 'open')->count(),
                'filters' => $request->only(['search', 'category', 'location', 'workplace', 'employment_type', 'level', 'tag', 'sort', 'status', 'featured', 'min_salary', 'max_salary']),
            ]
        );
    }

    public function show(Job $job)
    {
        $job->load(['company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'category:id,slug,name,icon']);
        $job->increment('view_count');

        return $this->success(new JobResource($job), 'Job retrieved.');
    }
}
