<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Notifications\PlatformNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\ApiTestCase;

class SeekerTest extends ApiTestCase
{
    public function test_seeker_can_apply_to_a_job(): void
    {
        $company = $this->employer()->company;
        $job = $this->makeJob($company);
        $seeker = $this->seeker();

        $this->asApiUser($seeker)
            ->postJson('/api/v1/seeker/applications', ['job_id' => $job->id])
            ->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('applications', ['job_id' => $job->id, 'seeker_id' => $seeker->id]);
        $this->assertDatabaseHas('jobs', ['id' => $job->id, 'applications_count' => 1]);
    }

    public function test_seeker_cannot_apply_twice(): void
    {
        $company = $this->employer()->company;
        $job = $this->makeJob($company);
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->postJson('/api/v1/seeker/applications', ['job_id' => $job->id])->assertStatus(201);
        $this->asApiUser($seeker)->postJson('/api/v1/seeker/applications', ['job_id' => $job->id])->assertStatus(409);
    }

    public function test_seeker_cannot_apply_to_a_closed_job(): void
    {
        $company = $this->employer()->company;
        $job = $this->makeJob($company, ['status' => 'closed']);
        $seeker = $this->seeker();

        $this->asApiUser($seeker)
            ->postJson('/api/v1/seeker/applications', ['job_id' => $job->id])
            ->assertStatus(422);
    }

    public function test_seeker_sees_only_own_applications(): void
    {
        $company = $this->employer()->company;
        $job = $this->makeJob($company);
        $otherJob = $this->makeJob($company);

        $seeker = $this->seeker();
        $other = $this->seeker();
        $this->makeApplication($job, $seeker);
        $this->makeApplication($otherJob, $other);

        $response = $this->asApiUser($seeker)->getJson('/api/v1/seeker/applications')->assertOk();
        $applications = $response->json('data');

        $this->assertCount(1, $applications);
        $this->assertSame($seeker->id, $applications[0]['seeker_id']);
    }

    public function test_seeker_can_save_and_remove_a_job(): void
    {
        $company = $this->employer()->company;
        $job = $this->makeJob($company);
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->postJson('/api/v1/seeker/saved-jobs', ['job_id' => $job->id])->assertStatus(201);
        $this->assertDatabaseHas('saved_jobs', ['job_id' => $job->id, 'seeker_id' => $seeker->id]);

        $this->asApiUser($seeker)->getJson('/api/v1/seeker/saved-jobs')->assertOk();
        $this->asApiUser($seeker)->deleteJson('/api/v1/seeker/saved-jobs/'.$job->id)->assertOk();
        $this->assertDatabaseMissing('saved_jobs', ['job_id' => $job->id, 'seeker_id' => $seeker->id]);
    }

    public function test_seeker_can_update_profile(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($seeker)
            ->patchJson('/api/v1/seeker/profile', [
                'headline' => 'Senior Frontend Developer',
                'location' => 'Lagos',
                'skills' => ['React', 'TypeScript'],
            ])
            ->assertOk();

        $this->assertDatabaseHas('profiles', [
            'user_id' => $seeker->id,
            'headline' => 'Senior Frontend Developer',
            'location' => 'Lagos',
        ]);
    }

    public function test_seeker_can_upload_download_and_delete_cv(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();

        $upload = $this->asApiUser($seeker)
            ->post('/api/v1/seeker/cv', ['cv' => self::fakePdf('resume.pdf')])
            ->assertStatus(201);

        $profile = Profile::where('user_id', $seeker->id)->firstOrFail();
        $this->assertNotNull($profile->cv_path);
        Storage::disk('local')->exists($profile->cv_path) || $this->fail('Stored CV file is missing.');

        $this->get('/api/v1/seeker/cv/download')->assertOk();
        $this->getJson('/api/v1/seeker/cv')->assertOk()->assertJsonPath('data.has_cv', true);

        $this->asApiUser($seeker)->deleteJson('/api/v1/seeker/cv')->assertOk();
        $this->assertNull($profile->refresh()->cv_path);
    }

    public function test_cv_upload_rejects_unsafe_file_types(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();

        $this->asApiUser($seeker)
            ->post('/api/v1/seeker/cv', ['cv' => UploadedFile::fake()->create('malware.php', 10, 'text/x-php')])
            ->assertStatus(422);
    }

    /**
     * `UploadedFile::fake()->create()` writes a file of the requested size but
     * with no real content, so finfo reports nothing meaningful. The upload
     * guard sniffs the actual bytes, so the fixture has to be a real document
     * for the happy path to mean anything.
     */
    public static function fakePdf(string $name = 'resume.pdf'): UploadedFile
    {
        $bytes = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            ."2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n"
            .'trailer<</Root 1 0 R>>'."\n%%EOF\n";

        return UploadedFile::fake()->createWithContent($name, $bytes.str_repeat(' ', 2048));
    }

    public function test_seeker_can_read_notifications(): void
    {
        $seeker = $this->seeker();
        $seeker->notify(new PlatformNotification([
            'category' => 'applications',
            'text' => 'You have a new update.',
        ]));

        $this->asApiUser($seeker)
            ->getJson('/api/v1/seeker/notifications')
            ->assertOk()
            ->assertJsonStructure(['data' => ['notifications', 'unread_count']]);
    }

    public function test_seeker_notifications_are_paginated(): void
    {
        $seeker = $this->seeker();
        foreach (range(1, 7) as $i) {
            $seeker->notify(new PlatformNotification([
                'category' => $i % 2 === 0 ? 'interviews' : 'applications',
                'text' => "Update {$i}.",
            ]));
        }

        $this->asApiUser($seeker)
            ->getJson('/api/v1/seeker/notifications?per_page=3')
            ->assertOk()
            ->assertJsonCount(3, 'data.notifications')
            // The badge count must describe every unread notification, not
            // just the three returned on this page.
            ->assertJsonPath('data.unread_count', 7)
            ->assertJsonPath('meta.total', 7)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.per_page', 3);
    }

    public function test_seeker_notifications_can_be_filtered_by_category(): void
    {
        $seeker = $this->seeker();
        $seeker->notify(new PlatformNotification(['category' => 'applications', 'text' => 'Applied.']));
        $seeker->notify(new PlatformNotification(['category' => 'interviews', 'text' => 'Interview booked.']));
        $seeker->notify(new PlatformNotification(['category' => 'interviews', 'text' => 'Interview moved.']));

        $this->asApiUser($seeker)
            ->getJson('/api/v1/seeker/notifications?category=interviews')
            ->assertOk()
            ->assertJsonCount(2, 'data.notifications')
            ->assertJsonPath('meta.total', 2);
    }

    public function test_seeker_can_mark_one_notification_read(): void
    {
        $seeker = $this->seeker();
        $seeker->notify(new PlatformNotification(['category' => 'applications', 'text' => 'Applied.']));
        $id = $seeker->notifications()->firstOrFail()->id;

        $this->asApiUser($seeker)
            ->patchJson("/api/v1/seeker/notifications/{$id}/read")
            ->assertOk();

        $this->assertSame(0, $seeker->unreadNotifications()->count());
    }

    public function test_seeker_cannot_mark_another_users_notification_read(): void
    {
        $seeker = $this->seeker();
        $other = $this->seeker();
        $other->notify(new PlatformNotification(['category' => 'applications', 'text' => 'Applied.']));
        $id = $other->notifications()->firstOrFail()->id;

        $this->asApiUser($seeker)
            ->patchJson("/api/v1/seeker/notifications/{$id}/read")
            ->assertNotFound();

        $this->assertSame(1, $other->unreadNotifications()->count());
    }

    public function test_seeker_can_mark_all_notifications_read(): void
    {
        $seeker = $this->seeker();
        $other = $this->seeker();
        foreach (range(1, 3) as $i) {
            $seeker->notify(new PlatformNotification(['category' => 'applications', 'text' => "Update {$i}."]));
            $other->notify(new PlatformNotification(['category' => 'applications', 'text' => "Update {$i}."]));
        }
        // An already-read row must not be counted or re-stamped.
        $seeker->notifications()->first()->markAsRead();

        $this->asApiUser($seeker)
            ->postJson('/api/v1/seeker/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.marked', 2);

        $this->assertSame(0, $seeker->unreadNotifications()->count());
        $this->assertSame(3, $other->unreadNotifications()->count());
    }
}
