<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Notifications\PlatformNotification;
use Illuminate\Support\Facades\Storage;
use Tests\ApiTestCase;

class EmployerTest extends ApiTestCase
{
    public function test_employer_can_create_a_job(): void
    {
        $employer = $this->employer();

        $this->asApiUser($employer)->postJson('/api/v1/employer/jobs', [
            'title' => 'Frontend Developer',
            'workplace' => 'remote',
            'employment_type' => 'full-time',
            'description' => 'Build great interfaces.',
            'status' => 'open',
        ])->assertStatus(201);

        $this->assertDatabaseHas('jobs', ['title' => 'Frontend Developer', 'status' => 'open']);
    }

    public function test_employer_can_update_and_delete_own_job(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);

        $this->asApiUser($employer)
            ->putJson('/api/v1/employer/jobs/'.$job->slug, ['title' => 'Updated Role'])
            ->assertOk();

        $this->assertDatabaseHas('jobs', ['id' => $job->id, 'title' => 'Updated Role']);

        $this->asApiUser($employer)->deleteJson('/api/v1/employer/jobs/'.$job->slug)->assertOk();
        $this->assertSoftDeleted('jobs', ['id' => $job->id]);
    }

    public function test_employer_cannot_modify_another_companys_job(): void
    {
        $other = $this->employer();
        $job = $this->makeJob($other->company);
        $attacker = $this->employer();

        $this->asApiUser($attacker)
            ->putJson('/api/v1/employer/jobs/'.$job->slug, ['title' => 'Hijacked'])
            ->assertStatus(403);

        $this->asApiUser($attacker)
            ->patchJson('/api/v1/employer/jobs/'.$job->slug.'/status', ['status' => 'closed'])
            ->assertStatus(403);

        $this->assertDatabaseHas('jobs', ['id' => $job->id, 'title' => $job->title, 'status' => 'open']);
    }

    public function test_employer_sees_only_own_applicants(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $otherEmployer = $this->employer();
        $otherJob = $this->makeJob($otherEmployer->company);

        $seeker = $this->seeker();
        $this->makeApplication($job, $seeker);
        $this->makeApplication($otherJob, $seeker);

        $response = $this->asApiUser($employer)->getJson('/api/v1/employer/applicants')->assertOk();
        $applications = $response->json('data');

        $this->assertCount(1, $applications);
        $this->assertSame($seeker->id, $applications[0]['seeker_id']);
    }

    public function test_employer_can_update_application_status(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $seeker = $this->seeker();
        $application = $this->makeApplication($job, $seeker);

        $this->asApiUser($employer)
            ->patchJson('/api/v1/employer/applicants/'.$application->id.'/status', ['status' => 'shortlisted'])
            ->assertOk();

        $this->assertDatabaseHas('applications', ['id' => $application->id, 'status' => 'shortlisted']);
    }

    public function test_employer_cannot_access_another_companys_applicant(): void
    {
        $owner = $this->employer();
        $job = $this->makeJob($owner->company);
        $seeker = $this->seeker();
        $application = $this->makeApplication($job, $seeker);
        $attacker = $this->employer();

        $this->asApiUser($attacker)
            ->getJson('/api/v1/employer/applicants/'.$application->id)
            ->assertStatus(403);

        $this->asApiUser($attacker)
            ->patchJson('/api/v1/employer/applicants/'.$application->id.'/status', ['status' => 'rejected'])
            ->assertStatus(403);
    }

    public function test_employer_can_download_applicant_cv_but_other_employers_cannot(): void
    {
        Storage::fake('local');
        $owner = $this->employer();
        $job = $this->makeJob($owner->company);

        $seeker = $this->seeker();
        $path = $seeker->profile->update(['cv_path' => 'cv/'.$seeker->id.'/file.pdf', 'cv_name' => 'resume.pdf']);
        Storage::disk('local')->put('cv/'.$seeker->id.'/file.pdf', 'pdf-bytes');
        $application = $this->makeApplication($job, $seeker);

        $this->asApiUser($owner)->get('/api/v1/employer/applicants/'.$application->id.'/cv')->assertOk();

        $attacker = $this->employer();
        $this->asApiUser($attacker)->get('/api/v1/employer/applicants/'.$application->id.'/cv')->assertStatus(403);
    }

    /**
     * A candidate who never uploaded a CV is a normal state, not a fault, and it
     * arrives as 404 like any other absent resource. What makes it unambiguous
     * is the `cv_not_uploaded` code: the client branches on that to show "No CV
     * uploaded" rather than a bare download failure, which is the difference
     * between a correct answer and a bug report.
     */
    public function test_downloading_a_cv_the_candidate_never_uploaded_is_not_reported_as_a_broken_file(): void
    {
        Storage::fake('local');
        $owner = $this->employer();
        $job = $this->makeJob($owner->company);
        $seeker = $this->seeker();
        $application = $this->makeApplication($job, $seeker);

        $this->assertNull($application->cv_path);
        $this->assertNull($seeker->profile->cv_path);

        $this->asApiUser($owner)
            ->getJson('/api/v1/employer/applicants/'.$application->id.'/cv')
            ->assertStatus(404)
            ->assertJsonPath('error_code', 'cv_not_uploaded')
            ->assertJsonPath('success', false);
    }

    /**
     * The other 404 is ours, not the candidate's: a path in the database with
     * nothing behind it. It has to stay distinguishable from the case above,
     * because one is fixed by asking the candidate to re-upload and the other by
     * restoring the file on disk.
     */
    public function test_downloading_a_cv_recorded_but_absent_from_disk_is_reported_separately(): void
    {
        Storage::fake('local');
        $owner = $this->employer();
        $job = $this->makeJob($owner->company);
        $seeker = $this->seeker();

        $path = 'cv/'.$seeker->id.'/vanished.pdf';
        $seeker->profile->update(['cv_path' => $path, 'cv_name' => 'vanished.pdf']);

        // Recorded, but never actually written — the inconsistency this guards.
        Storage::disk('local')->assertMissing($path);

        $application = $this->makeApplication($job, $seeker);

        $this->asApiUser($owner)
            ->getJson('/api/v1/employer/applicants/'.$application->id.'/cv')
            ->assertStatus(404)
            ->assertJsonPath('error_code', 'cv_file_missing');
    }

    /**
     * The application snapshots the CV at the moment of applying, so a download
     * still resolves after the candidate replaces or deletes the file on their
     * own profile. Without the snapshot the row's path is null and every
     * historical application silently becomes undownloadable — which is the
     * same 404 as "no CV", from a cause that looks identical to the client.
     *
     * Driven through the real apply endpoint, because that is the only place
     * the snapshot is taken.
     */
    public function test_an_application_downloads_the_cv_it_snapshot_at_the_time_of_applying(): void
    {
        Storage::fake('local');
        $owner = $this->employer();
        $job = $this->makeJob($owner->company);
        $seeker = $this->seeker();

        $seeker->profile->update(['cv_path' => 'cv/'.$seeker->id.'/at-apply.pdf']);
        Storage::disk('local')->put('cv/'.$seeker->id.'/at-apply.pdf', 'pdf-bytes');

        $this->asApiUser($seeker)
            ->postJson('/api/v1/seeker/applications', ['job_id' => $job->id])
            ->assertCreated();

        // Taken from the row rather than the response: the resource publishes the
        // public `app-{id}` form, and this route binds on the integer key.
        $application = Application::where('job_id', $job->id)
            ->where('seeker_id', $seeker->id)
            ->sole();

        $this->assertSame('cv/'.$seeker->id.'/at-apply.pdf', $application->cv_path);

        // The candidate replaces their CV afterwards.
        $seeker->profile->update(['cv_path' => 'cv/'.$seeker->id.'/later.pdf']);
        Storage::disk('local')->put('cv/'.$seeker->id.'/later.pdf', 'other-bytes');

        $response = $this->asApiUser($owner)
            ->get('/api/v1/employer/applicants/'.$application->id.'/cv')
            ->assertOk();

        $this->assertSame('pdf-bytes', $response->streamedContent());
    }

    public function test_employer_dashboard_returns_stats(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $seeker = $this->seeker();
        $this->makeApplication($job, $seeker);

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/dashboard')
            ->assertOk()
            ->assertJsonPath('data.stats.0.key', 'jobs')
            ->assertJsonPath('data.stats.0.value', 1);
    }

    public function test_seeker_role_cannot_access_employer_endpoints(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->getJson('/api/v1/employer/jobs')->assertStatus(403);
    }

    public function test_employer_can_read_notifications(): void
    {
        $employer = $this->employer();
        $employer->notify(new PlatformNotification(['category' => 'applications', 'text' => 'New applicant.']));

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/notifications')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['notifications', 'unread_count'],
                'meta' => ['current_page', 'per_page', 'last_page', 'total'],
            ])
            ->assertJsonPath('data.unread_count', 1);
    }

    public function test_employer_notifications_are_paginated(): void
    {
        $employer = $this->employer();
        foreach (range(1, 5) as $i) {
            $employer->notify(new PlatformNotification([
                'category' => 'applications',
                'text' => "Applicant {$i}.",
            ]));
        }

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/notifications?per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data.notifications')
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.last_page', 3)
            // The badge must count every unread notification, not just the two
            // returned on this page.
            ->assertJsonPath('data.unread_count', 5);
    }

    public function test_employer_notifications_can_be_filtered_by_category(): void
    {
        $employer = $this->employer();
        $employer->notify(new PlatformNotification(['category' => 'applications', 'text' => 'New applicant.']));
        $employer->notify(new PlatformNotification(['category' => 'interviews', 'text' => 'Interview booked.']));

        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/notifications?category=interviews')
            ->assertOk()
            ->assertJsonCount(1, 'data.notifications')
            ->assertJsonPath('meta.total', 1);
    }

    public function test_employer_can_mark_a_notification_read(): void
    {
        $employer = $this->employer();
        $employer->notify(new PlatformNotification(['category' => 'applications', 'text' => 'New applicant.']));
        $id = $employer->notifications()->firstOrFail()->id;

        $this->asApiUser($employer)
            ->patchJson("/api/v1/employer/notifications/{$id}/read")
            ->assertOk();

        $this->assertSame(0, $employer->unreadNotifications()->count());
    }

    public function test_employer_cannot_mark_another_users_notification_read(): void
    {
        $employer = $this->employer();
        $other = $this->employer();
        $other->notify(new PlatformNotification(['category' => 'applications', 'text' => 'New applicant.']));
        $id = $other->notifications()->firstOrFail()->id;

        $this->asApiUser($employer)
            ->patchJson("/api/v1/employer/notifications/{$id}/read")
            ->assertNotFound();

        $this->assertSame(1, $other->unreadNotifications()->count());
    }

    public function test_employer_can_mark_all_notifications_read(): void
    {
        $employer = $this->employer();
        $other = $this->employer();
        foreach (range(1, 2) as $i) {
            $employer->notify(new PlatformNotification(['category' => 'applications', 'text' => "Applicant {$i}."]));
            $other->notify(new PlatformNotification(['category' => 'applications', 'text' => "Applicant {$i}."]));
        }

        $this->asApiUser($employer)
            ->postJson('/api/v1/employer/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.marked', 2);

        $this->assertSame(0, $employer->unreadNotifications()->count());
        $this->assertSame(2, $other->unreadNotifications()->count());
    }
}
