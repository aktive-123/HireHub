<?php

namespace Tests\Feature;

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
