<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ApplicationStatus;
use App\Enums\JobStatus;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\ApplicationResource;
use App\Http\Resources\V1\NotificationResource;
use App\Http\Resources\V1\SavedJobResource;
use App\Models\ActivityLog;
use App\Models\Application;
use App\Models\Job;
use App\Models\Profile;
use App\Models\SavedJob;
use App\Services\HiringFeeService;
use App\Services\Upsell\UpsellCatalogue;
use App\Support\Address;
use App\Support\Notifier;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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
                // Counted separately from `active` because it is the only status
                // that is waiting on the seeker rather than on the employer. An
                // offer sitting unanswered is a role they are one tap from, and
                // burying it in the applications total is how it goes stale.
                ['key' => 'awaiting_response', 'label' => 'Needs your answer', 'value' => $statusCounts[ApplicationStatus::OfferConfirmedPendingAcceptance->value] ?? 0, 'tone' => 'warning'],
                ['key' => 'interview', 'label' => 'Interviews', 'value' => $statusCounts['interview'] ?? 0, 'tone' => 'warning'],
                ['key' => 'hired', 'label' => 'Hired', 'value' => $statusCounts['hired'] ?? 0, 'tone' => 'success'],
                ['key' => 'saved_jobs', 'label' => 'Saved jobs', 'value' => SavedJob::where('seeker_id', $user->id)->count(), 'tone' => 'secondary'],
            ],
            'recent_applications' => ApplicationResource::collection(
                $applications->sortByDesc('applied_at')->take(5)->load(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone,avatar_url,profile_picture'])
            ),
        ], 'Dashboard retrieved.');
    }

    public function applications(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 20)));
        $seekerId = $request->user()->id;

        $paginator = Application::where('seeker_id', $seekerId)
            ->when($request->filled('status'), fn ($q) => $q->whereIn('status', explode(',', $request->input('status'))))
            ->with(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone,avatar_url,profile_picture'])
            ->orderByDesc('applied_at')
            ->paginate($perPage);

        // Unfiltered tallies alongside the filtered page. Without these the
        // status tabs can only count the rows that survived the active filter,
        // so every other tab reads "0" the moment one is selected.
        $statusCounts = Application::where('seeker_id', $seekerId)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return $this->success(
            ApplicationResource::collection($paginator->items()),
            'Applications retrieved.',
            200,
            [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'status_counts' => $statusCounts,
            ]
        );
    }

    public function application(Request $request, $id)
    {
        $application = Application::with(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone,avatar_url,profile_picture', 'seeker.profile.experiences', 'seeker.profile.educations'])
            ->where('seeker_id', $request->user()->id)
            ->findOrFail($id);

        return $this->success(new ApplicationResource($application), 'Application retrieved.');
    }

    /**
     * Accept a confirmed offer. Free, and never charged for.
     *
     * The employer has already paid the hiring fee by the time this state is
     * reachable, so there is nothing to collect here — the only job of this
     * endpoint is to record the seeker's consent and complete the hire.
     *
     * Scoped by seeker_id in the query rather than fetched-then-checked, so an
     * application belonging to somebody else is a 404 and not a disclosure
     * that it exists.
     */
    public function acceptOffer(Request $request, $id)
    {
        $application = Application::with(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone,avatar_url,profile_picture', 'seeker.profile'])
            ->where('seeker_id', $request->user()->id)
            ->findOrFail($id);

        // Already accepted: report success rather than refusing, because a
        // double-tap or a retried request is not a client error and the state
        // the caller asked for is the state it is in.
        if ($application->status === ApplicationStatus::Hired) {
            return $this->success(
                new ApplicationResource($application),
                'This offer has already been accepted.'
            );
        }

        if ($application->status !== ApplicationStatus::OfferConfirmedPendingAcceptance) {
            return $this->error(
                'This application has no confirmed offer waiting on you.',
                409,
                null,
                ['status' => $application->status->value],
                'no_confirmed_offer'
            );
        }

        $application = app(HiringFeeService::class)->completeHire($application);

        return $this->success(
            new ApplicationResource($application->load(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone,avatar_url,profile_picture'])),
            'Offer accepted. You are hired.',
            200,
            ['upsells' => UpsellCatalogue::availableFor($application)]
        );
    }

    /**
     * Decline a confirmed offer.
     *
     * The hiring fee is kept — the employer committed to the hire and paid for
     * it, and this endpoint does not move money. The application leaves the
     * active pipeline, and the employer is told so they can reopen the role.
     */
    public function declineOffer(Request $request, $id)
    {
        $application = Application::with(['job:id,title,company_id', 'job.company:id,name', 'seeker:id,name,email'])
            ->where('seeker_id', $request->user()->id)
            ->findOrFail($id);

        if (! in_array($application->status, [
            ApplicationStatus::OfferConfirmedPendingAcceptance,
            ApplicationStatus::Offer,
        ], true)) {
            return $this->error(
                'This application has no offer to decline.',
                409,
                null,
                ['status' => $application->status->value],
                'no_offer'
            );
        }

        $application->update(['status' => ApplicationStatus::Withdrawn]);

        $job = $application->job;

        // Re-read through the relation: the query above selects the company
        // with an explicit column list that has no `user_id`, so reading
        // `$job->company->user` off that partial model resolves to null and the
        // employer would never learn their offer was declined.
        $employer = $job?->company()->with('user')->first()?->user;

        if ($employer) {
            Notifier::send($employer, [
                'category' => 'applications',
                'type' => 'warning',
                'icon' => 'bi-envelope-x-fill',
                'text' => ($application->seeker?->profile?->full_name ?? $application->seeker?->name ?? 'A candidate').' has declined your offer for '.($job?->title ?? 'the role').'. The listing stays open so you can continue.',
                'action' => 'View applicant',
                'link' => '/employer/applicants/'.$application->id,
                'subject' => 'Offer declined — '.($job?->title ?? 'the role'),
            ]);
        }

        return $this->success(
            new ApplicationResource($application->fresh(['job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified', 'seeker:id,name,email,phone,avatar_url,profile_picture'])),
            'Offer declined.'
        );
    }

    public function apply(Request $request)
    {
        $validated = $request->validate([
            'job_id' => ['required', 'integer', 'exists:jobs,id'],
            'cover_letter' => ['nullable', 'string', 'max:5000'],
        ]);

        $user = $request->user();
        $job = Job::with('company:id,slug,name,logo_text,logo_bg,logo_color,is_verified')->findOrFail($validated['job_id']);

        if ($job->status !== JobStatus::Open) {
            return $this->error('This job is no longer accepting applications.', 422);
        }

        if (Application::where('job_id', $job->id)->where('seeker_id', $user->id)->exists()) {
            return $this->error('You have already applied to this job.', 409);
        }

        $profile = Profile::where('user_id', $user->id)->first();
        $skills = collect($profile?->skills ?? [])->filter(fn ($s) => is_string($s))->map(fn ($s) => strtolower(trim($s)))->unique()->values();
        $tags = collect($job->tags ?? [])->filter(fn ($t) => is_string($t))->map(fn ($t) => strtolower(trim($t)))->unique()->values();

        $match = 0;
        if ($skills->isNotEmpty() && $tags->isNotEmpty()) {
            $hits = $tags->filter(fn ($tag) => $skills->contains(fn ($skill) => str_contains($skill, $tag) || str_contains($tag, $skill)));
            $match = (int) round($hits->count() / $tags->count() * 100);
        }

        $application = DB::transaction(function () use ($job, $user, $profile, $match, $validated) {
            $application = Application::create([
                'job_id' => $job->id,
                'seeker_id' => $user->id,
                'status' => ApplicationStatus::New,
                'match_score' => min(100, max(0, $match)),
                'cover_letter' => $validated['cover_letter'] ?? null,
                'cv_path' => $profile?->cv_path ?? null,
                'applied_at' => now(),
            ]);

            $job->increment('applications_count');

            return $application;
        });

        Notifier::send($job->company?->user, [
            'category' => 'applications',
            'type' => 'application',
            'icon' => 'bi-person-badge',
            'text' => 'You have a new applicant for '.$job->title.'.',
            'action' => 'View applicant',
            'link' => '/employer/applicants',
            'subject' => 'New applicant — '.$job->title,
        ]);

        return $this->success(
            new ApplicationResource($application->load([
                'job.company:id,slug,name,logo_text,logo_bg,logo_color,is_verified',
                'seeker:id,name,email,phone,avatar_url,profile_picture',
                'seeker.profile.experiences',
                'seeker.profile.educations',
            ])),
            'Application submitted.',
            201
        );
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
            'avatar_url' => $user->profilePictureUrl(),
            'phone' => $user->phone,
            'headline' => $user->headline ?? $profile?->headline,
            'location' => $profile?->location,
            'address_line' => $profile?->address_line,
            'city' => $profile?->city,
            'state' => $profile?->state,
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
            'phone' => Phone::rules(required: false),
            'headline' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            ...Address::rules(required: false, streetRequired: false),
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
            $user->update(['phone' => Phone::normalize($validated['phone'])]);
        }

        $profile = Profile::firstOrCreate(['user_id' => $user->id]);
        $profile->fill(array_filter($validated, fn ($key) => in_array($key, ['headline', 'location', 'address_line', 'city', 'state', 'summary', 'years_experience', 'notice_period', 'skills', 'certifications', 'portfolio'], true), ARRAY_FILTER_USE_KEY));

        // A client that only knows how to post the old free-text `location` — the
        // pre-existing edit profile form, for instance — still gets it stored, so
        // deriving `location` is confined to the requests that actually sent a
        // city or a state. Deriving it unconditionally would blank the location
        // of every account whose editor has not been updated yet.
        if ($request->hasAny(['city', 'state'])) {
            $profile->location = Address::location($profile->city, $profile->state) ?? $profile->location;
        }

        $profile->save();

        return $this->success(null, 'Profile updated.');
    }

    public function cv(Request $request)
    {
        $profile = Profile::firstOrCreate(['user_id' => $request->user()->id]);

        if (! $profile->cv_path) {
            return $this->success(null, 'No CV uploaded.');
        }

        return $this->success([
            'has_cv' => true,
            'name' => $profile->cv_name,
            'size' => Storage::disk('local')->size($profile->cv_path),
            'uploaded_at' => $profile->cv_updated_at?->toIso8601String(),
            'can_download' => true,
        ], 'CV retrieved.');
    }

    public function uploadCv(Request $request)
    {
        $config = config('security.uploads');

        $validated = $request->validate([
            'cv' => [
                'required',
                'file',
                // Extension and size are only what the client claims. The
                // detected MIME type below is the check that actually holds.
                'mimes:'.implode(',', $config['cv_extensions']),
                'max:'.$config['cv_max_kb'],
            ],
        ]);

        $file = $validated['cv'];

        // mimes: compares the client-supplied extension against guessed types.
        // Re-checking the bytes against an explicit allowlist closes the gap
        // where a .doc that is really an .exe, or a polyglot PDF/HTML, walks
        // straight through. `finfo` reads the file's own content, not a header
        // the caller controls. Compared lowercased because finfo is not
        // consistent about casing (it reports application/CDFV2 as written).
        $detected = strtolower((string) (mime_content_type($file->getRealPath()) ?: ''));
        $allowed = array_map('strtolower', $config['cv_mimetypes']);

        if (! in_array($detected, $allowed, true)) {
            throw ValidationException::withMessages([
                'cv' => ['That file type is not supported. Upload a PDF or Word document.'],
            ]);
        }

        $user = $request->user();
        $profile = Profile::firstOrCreate(['user_id' => $user->id]);

        // The stored name is fully random and the original filename is only
        // ever kept as a display label. Nothing user-controlled ever becomes
        // a path, so there is no traversal and no executable name on disk.
        $storedName = Str::random(40).'.'.strtolower($file->getClientOriginalExtension());
        $path = $file->storeAs('cv/'.$user->id, $storedName, 'local');

        if ($profile->cv_path) {
            Storage::disk('local')->delete($profile->cv_path);
        }

        $profile->update([
            'cv_path' => $path,
            'cv_name' => $this->safeDisplayName($file->getClientOriginalName()),
            'cv_updated_at' => now(),
        ]);

        ActivityLog::record($user, 'cv.uploaded', $profile);

        return $this->success([
            'has_cv' => true,
            'name' => $profile->cv_name,
            'uploaded_at' => $profile->cv_updated_at?->toIso8601String(),
        ], 'CV uploaded.', 201);
    }

    public function deleteCv(Request $request)
    {
        $profile = Profile::firstOrCreate(['user_id' => $request->user()->id]);

        if (! $profile->cv_path) {
            return $this->error('No CV to delete.', 404);
        }

        Storage::disk('local')->delete($profile->cv_path);
        $profile->update(['cv_path' => null, 'cv_name' => null, 'cv_updated_at' => null]);

        ActivityLog::record($request->user(), 'cv.deleted', $profile);

        return $this->success(null, 'CV deleted.');
    }

    public function downloadCv(Request $request)
    {
        $profile = Profile::firstOrCreate(['user_id' => $request->user()->id]);

        // Split the two refusals for the same reason as the employer's copy: a
        // seeker who never uploaded anything should see "No CV uploaded", while a
        // path with no file behind it is a real inconsistency worth surfacing.
        if (! $profile->cv_path) {
            return $this->error('No CV uploaded.', 404, null, null, 'cv_not_uploaded');
        }

        if (! Storage::disk('local')->exists($profile->cv_path)) {
            Log::warning('A CV path is recorded but the file is missing from the local disk.', [
                'user_id' => $request->user()->id,
                'cv_path' => $profile->cv_path,
            ]);

            return $this->error(
                'Your CV is on record but the file could not be found. Please upload it again.',
                404,
                null,
                null,
                'cv_file_missing'
            );
        }

        // The `local` disk lives outside the web root and this response is
        // forced to download with a neutral filename, so a malicious document
        // can never be rendered inline on the API's own origin.
        return Storage::disk('local')->download(
            $profile->cv_path,
            $this->safeDisplayName($profile->cv_name ?? 'cv'),
            ['Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff'],
        );
    }

    /**
     * Strip directory components, control characters and length from a
     * user-supplied filename. It is only ever used as a download label and as
     * text in the UI, but a name like `../../config/app.php` or one carrying a
     * quote must never reach a response header.
     */
    private function safeDisplayName(?string $name): string
    {
        $base = basename(str_replace('\\', '/', (string) $name));
        $clean = preg_replace('/[\x00-\x1F\x7F"\\\\\/]+/', '', $base) ?? '';
        $clean = trim($clean);

        return substr($clean === '' ? 'cv' : $clean, 0, 120);
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
