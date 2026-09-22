<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends ApiController
{
    public function index(Request $request)
    {
        $query = Category::query()
            ->withCount(['jobs as jobs_count' => fn ($q) => $q->where('status', 'open')->whereNull('deleted_at')])
            ->orderBy('sort_order')
            ->orderBy('name');

        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $paginator = $query->paginate($perPage)->withQueryString();

        return $this->success(
            CategoryResource::collection($paginator->items()),
            'Categories retrieved.',
            200,
            [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ]
        );
    }

    public function show(Category $category)
    {
        $category->load(['jobs.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'jobs.category:id,slug,name,icon']);
        $category->setAttribute('jobs_count', $category->jobs()->where('status', 'open')->whereNull('deleted_at')->count());

        return $this->success(new CategoryResource($category), 'Category retrieved.');
    }
}
