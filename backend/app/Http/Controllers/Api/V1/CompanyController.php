<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\CompanyResource;
use App\Models\Company;
use Illuminate\Http\Request;

class CompanyController extends ApiController
{
    public function index(Request $request)
    {
        $query = Company::query()->whereNull('deleted_at');

        if ($request->filled('search')) {
            $term = trim($request->input('search'));
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$term}%")
                ->orWhere('tagline', 'like', "%{$term}%")
                ->orWhere('description', 'like', "%{$term}%"));
        }

        if ($request->filled('industry')) {
            $query->whereIn('industry', explode(',', $request->input('industry')));
        }

        if ($request->filled('location')) {
            $query->where('location', 'like', '%'.$request->input('location').'%');
        }

        if ($request->filled('featured')) {
            $query->where('is_featured', filter_var($request->input('featured'), FILTER_VALIDATE_BOOLEAN));
        }

        $query->orderBy('is_featured', 'desc')
            ->orderBy('open_jobs_count', 'desc')
            ->orderBy('name', 'asc');

        $perPage = min(50, max(1, (int) $request->input('per_page', 12)));
        $paginator = $query->paginate($perPage)->withQueryString();

        return $this->success(
            CompanyResource::collection($paginator->items()),
            'Companies retrieved.',
            200,
            [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'filters' => $request->only(['search', 'industry', 'location', 'featured']),
            ]
        );
    }

    public function show(Company $company)
    {
        $company->load(['jobs.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'jobs.category:id,slug,name,icon']);

        return $this->success(new CompanyResource($company), 'Company retrieved.');
    }
}
