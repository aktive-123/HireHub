<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\ApplicationResource;
use App\Http\Resources\V1\NotificationResource;
use App\Http\Resources\V1\SavedJobResource;
use App\Models\Application;
use App\Models\Profile;
use App\Models\SavedJob;
use Illuminate\Http\Request;

class SeekerController extends ApiController
{
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $applications = Application::where('seeker_id', $user->id)->get();

        $statusCounts = $applications->groupBy('status')->map->count();
        $active = ($statusCounts['new'] ?? 0) + ($statusCounts['reviewing'] ?? 0) + ($statusCounts['shortlisted'] ?? 0);

        return $this->success([
            'stats' => [
                ['key' => 'applications', 'label' => 'Applications', 'value' => $applications->count(), 'tone' => 'primary'],
                ['key' => 'active', 'label' => 'Active', 'value' => $active, 'tone' => 'info'],
                ['key' => 'interview', 'label' => 'Interviews', 'value' => $statusCounts['interview'] ?? 0, 'tone' => 'warning'],
                ['key' => 'hired', 'label' => 'Hired', 'value' => $statusCounts['hired'] ?? 0, 'tone' => 'success'],
                ['key' => 'saved_jobs', 'label' => 'Saved jobs', 'value' => SavedJob::where('seeker_id', $user->id)->count(), 'tone' => 'secondary'],
            ],
            'recent_applications' => ApplicationResource::collection(
                $applications->sortByDesc('applied_at')->take(5)->load(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone'])
            ),
        ], 'Dashboard retrieved.');
    }

    public function applications(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $paginator = Application::where('seeker_id', $request->user()->id)
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->with(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone'])
            ->orderByDesc('applied_at')
            ->paginate($perPage);

        return $this->success(
            ApplicationResource::collection($paginator->items()),
            'Applications retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function application(Request $request, $id)
    {
        $application = Application::with(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone', 'seeker.profile.experiences', 'seeker.profile.educations'])
            ->where('seeker_id', $request->user()->id)
            ->findOrFail($id);

        return $this->success(new ApplicationResource($application), 'Application retrieved.');
    }

    public function savedJobs(Request $request)
    {
        $saved = SavedJob::where('seeker_id', $request->user()->id)
            ->with('job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'job.category:id,slug,name,icon')
            ->orderByDesc('saved_at')
            ->get();

        return $this->success(SavedJobResource::collection($saved), 'Saved jobs retrieved.');
    }

    public function saveJob(Request $request)
    {
        $validated = $request->validate(['job_id' => ['required', 'integer', 'exists:jobs,id']]);

        $saved = SavedJob::firstOrCreate([
            'seeker_id' => $request->user()->id,
            'job_id' => $validated['job_id'],
        ]);

        return $this->success(new SavedJobResource($saved->load('job.company', 'job.category')), 'Job saved.', 201);
    }

    public function unSaveJob(Request $request, $jobId)
    {
        $deleted = SavedJob::where('seeker_id', $request->user()->id)->where('job_id', $jobId)->delete();

        if (! $deleted) {
            return $this->error('Saved job not found.', 404);
        }

        return $this->success(null, 'Job removed from saved list.');
    }

    public function profile(Request $request)
    {
        $profile = Profile::where('user_id', $request->user()->id)->first();
        $user = $request->user();

        return $this->success([
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'headline' => $user->headline ?? $profile?->headline,
            'location' => $profile?->location,
            'summary' => $profile?->summary,
            'years_experience' => $profile?->years_experience,
            'notice_period' => $profile?->notice_period,
            'skills' => $profile?->skills ?? [],
            'certifications' => $profile?->certifications ?? [],
            'portfolio' => $profile?->portfolio ?? [],
        ], 'Profile retrieved.');
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string'],
            'years_experience' => ['nullable', 'string', 'max:255'],
            'notice_period' => ['nullable', 'string', 'max:255'],
            'skills' => ['nullable', 'array', 'max:100'],
            'skills.*' => ['string', 'max:100'],
            'certifications' => ['nullable', 'array'],
            'certifications.*' => ['string', 'max:255'],
            'portfolio' => ['nullable', 'array'],
            'portfolio.*' => ['string', 'max:255'],
        ]);

        $user = $request->user();
        if (isset($validated['name'])) {
            $user->update(['name' => $validated['name']]);
        }
        if (isset($validated['phone'])) {
            $user->update(['phone' => $validated['phone']]);
        }

        $profile = Profile::firstOrCreate(['user_id' => $user->id]);
        $profile->fill(array_filter($validated, fn ($key) => in_array($key, ['headline', 'location', 'summary', 'years_experience', 'notice_period', 'skills', 'certifications', 'portfolio'], true), ARRAY_FILTER_USE_KEY));
        $profile->save();

        return $this->success(null, 'Profile updated.');
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

    public function markNotificationRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return $this->success(null, 'Notification marked as read.');
    }
}
