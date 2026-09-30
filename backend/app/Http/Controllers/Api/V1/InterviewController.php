<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ApplicationStatus;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\InterviewResource;
use App\Models\Application;
use App\Models\Interview;
use App\Models\Job;
use App\Support\Notifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InterviewController extends ApiController
{
    private const STATUSES = ['pending', 'scheduled', 'confirmed', 'completed', 'cancelled'];

    private function companyOrFail(Request $request)
    {
        $company = $request->user()->company;

        if (! $company) {
            abort(response()->json(['success' => false, 'message' => 'Complete your company profile first.', 'errors' => ['No company attached to this account.']], 422));
        }

        return $company;
    }

    public function employerIndex(Request $request)
    {
        $company = $this->companyOrFail($request);
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = Interview::where('company_id', $company->id)
            ->with(['job:id,title,slug', 'seeker:id,name,email,phone'])
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->when($request->filled('q'), fn ($q) => $q->whereHas('seeker', fn ($s) => $s->where('name', 'like', '%'.$request->input('q').'%'))
                ->orWhereHas('job', fn ($j) => $j->where('title', 'like', '%'.$request->input('q').'%')))
            ->orderByDesc('scheduled_at')
            ->paginate($perPage);

        return $this->success(
            InterviewResource::collection($paginator->items()),
            'Interviews retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }

    public function employerShow(Request $request, Interview $interview)
    {
        $this->authorize('view', $interview);

        $interview->load(['job:id,title,slug', 'seeker:id,name,email,phone', 'application:id,job_id']);

        return $this->success(new InterviewResource($interview), 'Interview retrieved.');
    }

    public function schedule(Request $request)
    {
        $company = $this->companyOrFail($request);

        $validated = $request->validate([
            'application_id' => ['nullable', 'integer', 'exists:applications,id'],
            'job_id' => ['nullable', 'integer', 'exists:jobs,id'],
            'seeker_id' => ['nullable', 'integer', 'exists:users,id'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'duration_minutes' => ['nullable', 'integer', 'between:15,480'],
            'mode' => ['required', 'string', 'in:video,on-site,phone'],
            'link' => ['nullable', 'url', 'max:500'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', 'string', Rule::in(self::STATUSES)],
        ]);

        $application = $request->filled('application_id')
            ? Application::with('job:id,company_id,title')->findOrFail($validated['application_id'])
            : null;

        if ($application) {
            // An employer may only schedule interviews for applicants to their
            // own postings.
            $this->authorize('updateStatus', $application);
            $validated['job_id'] = $application->job_id;
            $validated['seeker_id'] = $application->seeker_id;
        } else {
            $job = Job::with('company:id,name')->findOrFail($validated['job_id'] ?? abort(422, 'job_id or application_id is required.'));
            $this->authorize('updateStatus', $job);
            $validated['seeker_id'] = $validated['seeker_id'] ?? abort(422, 'seeker_id is required when no application is referenced.');
        }

        $validated['company_id'] = $company->id;
        $validated['created_by'] = $request->user()->id;
        $validated['status'] = $validated['status'] ?? 'scheduled';

        $interview = DB::transaction(function () use ($validated, $application) {
            $interview = Interview::create($validated);

            if ($application) {
                $application->update(['status' => ApplicationStatus::Interview]);
            }

            return $interview;
        });

        $interview->load(['job:id,title,slug', 'seeker:id,name,email,phone']);

        Notifier::send($interview->seeker, [
            'category' => 'interviews',
            'type' => 'interview',
            'icon' => 'bi-camera-video',
            'text' => 'You have a new interview for '.($interview->job?->title ?? 'a job').' scheduled for '.$interview->scheduled_at?->format('D, M j, Y g:i A').'.',
            'action' => 'View interview',
            'link' => '/seeker/applications',
            'subject' => 'Interview scheduled — '.($interview->job?->title ?? 'HireHub'),
        ]);

        return $this->success(new InterviewResource($interview), 'Interview scheduled.', 201);
    }

    public function update(Request $request, Interview $interview)
    {
        $this->authorize('update', $interview);

        $validated = $request->validate([
            'scheduled_at' => ['sometimes', 'date', 'after:now'],
            'duration_minutes' => ['nullable', 'integer', 'between:15,480'],
            'mode' => ['sometimes', 'string', 'in:video,on-site,phone'],
            'link' => ['nullable', 'url', 'max:500'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $interview->update($validated);

        return $this->success(new InterviewResource($interview->load(['job:id,title,slug', 'seeker:id,name,email,phone'])), 'Interview updated.');
    }

    public function updateStatus(Request $request, Interview $interview)
    {
        $this->authorize('updateStatus', $interview);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(self::STATUSES)],
        ]);

        DB::transaction(function () use ($interview, $validated) {
            $interview->update(['status' => $validated['status']]);

            if ($validated['status'] === 'completed' && $interview->application_id) {
                Application::find($interview->application_id)?->update(['status' => ApplicationStatus::Interview]);
            }

            if ($validated['status'] === 'cancelled' && $interview->application_id) {
                Application::find($interview->application_id)?->update(['status' => ApplicationStatus::Reviewing]);
            }
        });

        Notifier::send($interview->seeker, [
            'category' => 'interviews',
            'type' => 'interview',
            'icon' => 'bi-calendar-x',
            'text' => 'Your interview for '.($interview->job?->title ?? 'a job').' is now '.$validated['status'].'.',
            'action' => 'View application',
            'link' => '/seeker/applications',
            'subject' => 'Interview '.$validated['status'].' — '.($interview->job?->title ?? 'HireHub'),
        ]);

        return $this->success(new InterviewResource($interview->load(['job:id,title,slug', 'seeker:id,name,email,phone'])), 'Interview status updated.');
    }

    public function destroy(Request $request, Interview $interview)
    {
        $this->authorize('delete', $interview);

        $interview->delete();

        return $this->success(null, 'Interview deleted.');
    }

    public function seekerIndex(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));

        $paginator = Interview::where('seeker_id', $request->user()->id)
            ->with(['job:id,title,slug', 'seeker:id,name,email,phone'])
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->orderByDesc('scheduled_at')
            ->paginate($perPage);

        return $this->success(
            InterviewResource::collection($paginator->items()),
            'Interviews retrieved.',
            200,
            ['current_page' => $paginator->currentPage(), 'per_page' => $paginator->perPage(), 'last_page' => $paginator->lastPage(), 'total' => $paginator->total()]
        );
    }
}
