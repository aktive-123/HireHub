<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\ApiTestCase;

/**
 * Regression coverage for the tenant-boundary and role-boundary rules.
 *
 * These assertions were absent while the API leaked every applicant's contact
 * details to any authenticated caller and let seekers reach employer endpoints,
 * so they are pinned here explicitly.
 */
class AuthorizationTest extends ApiTestCase
{
    public function test_seeker_cannot_reach_any_employer_endpoint(): void
    {
        $seeker = $this->seeker();

        foreach ([
            '/api/v1/employer/dashboard',
            '/api/v1/employer/jobs',
            '/api/v1/employer/applicants',
            '/api/v1/employer/company',
            '/api/v1/employer/notifications',
            '/api/v1/employer/interviews',
        ] as $url) {
            $this->asApiUser($seeker)->getJson($url)->assertForbidden();
        }
    }

    public function test_employer_cannot_reach_any_seeker_endpoint(): void
    {
        $employer = $this->employer();

        foreach ([
            '/api/v1/seeker/dashboard',
            '/api/v1/seeker/applications',
            '/api/v1/seeker/saved-jobs',
            '/api/v1/seeker/profile',
            '/api/v1/seeker/cv',
            '/api/v1/seeker/interviews',
        ] as $url) {
            $this->asApiUser($employer)->getJson($url)->assertForbidden();
        }
    }

    public function test_seeker_cannot_post_to_employer_job_routes(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->postJson('/api/v1/employer/jobs', [
            'title' => 'Injected',
            'workplace' => 'remote',
            'employment_type' => 'full-time',
            'description' => 'nope',
        ])->assertForbidden();

        $this->assertDatabaseMissing('jobs', ['title' => 'Injected']);
    }

    public function test_application_list_is_scoped_to_the_caller(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $mine = $this->seeker();
        $theirs = $this->seeker();
        $this->makeApplication($job, $mine);
        $this->makeApplication($job, $theirs);

        // A seeker only ever sees their own submission, not the whole table.
        $ids = $this->asApiUser($mine)
            ->getJson('/api/v1/applications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->json('data.*.seeker_id');

        $this->assertSame([$mine->id], $ids);
    }

    public function test_employer_application_list_only_covers_own_company(): void
    {
        $mine = $this->employer();
        $other = $this->employer();
        $job = $this->makeJob($other->company);
        $seeker = $this->seeker();
        $this->makeApplication($job, $seeker);

        $this->asApiUser($mine)
            ->getJson('/api/v1/applications')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_seeker_cannot_read_another_seekers_application(): void
    {
        $job = $this->makeJob($this->employer()->company);
        $owner = $this->seeker();
        $attacker = $this->seeker();
        $application = $this->makeApplication($job, $owner);

        $this->asApiUser($attacker)
            ->getJson('/api/v1/applications/'.$application->id)
            ->assertForbidden();
    }

    public function test_employer_cannot_read_another_companys_application_via_shared_route(): void
    {
        $owner = $this->employer();
        $job = $this->makeJob($owner->company);
        $application = $this->makeApplication($job, $this->seeker());
        $attacker = $this->employer();

        $this->asApiUser($attacker)
            ->getJson('/api/v1/applications/'.$application->id)
            ->assertForbidden();
    }

    public function test_employer_cannot_download_cv_across_tenants(): void
    {
        $owner = $this->employer();
        $job = $this->makeJob($owner->company);
        $seeker = $this->seeker();
        $seeker->profile->update(['cv_path' => 'cv/'.$seeker->id.'/resume.pdf']);
        Storage::disk('local')->put('cv/'.$seeker->id.'/resume.pdf', 'pdf');
        $application = $this->makeApplication($job, $seeker);
        $attacker = $this->employer();

        $this->asApiUser($attacker)
            ->getJson('/api/v1/employer/applicants/'.$application->id.'/cv')
            ->assertForbidden();

        $this->asApiUser($attacker)
            ->getJson('/api/v1/employer/applicants/'.$application->id)
            ->assertForbidden();
    }

    public function test_seeker_cannot_advance_their_own_application_status(): void
    {
        $job = $this->makeJob($this->employer()->company);
        $seeker = $this->seeker();
        $application = $this->makeApplication($job, $seeker);

        $this->asApiUser($seeker)
            ->patchJson('/api/v1/employer/applicants/'.$application->id.'/status', ['status' => 'hired'])
            ->assertForbidden();

        $this->assertDatabaseHas('applications', ['id' => $application->id, 'status' => 'new']);
    }

    public function test_employer_cannot_touch_another_companys_job(): void
    {
        $job = $this->makeJob($this->employer()->company);
        $attacker = $this->employer();

        $this->asApiUser($attacker)
            ->patchJson('/api/v1/employer/jobs/'.$job->slug.'/status', ['status' => 'closed'])
            ->assertForbidden();

        $this->asApiUser($attacker)
            ->deleteJson('/api/v1/employer/jobs/'.$job->slug)
            ->assertForbidden();

        $this->assertDatabaseHas('jobs', ['id' => $job->id, 'status' => $job->status]);
        $this->assertNull($job->fresh()?->deleted_at);
    }

    public function test_admin_cannot_impersonate_employer_writes(): void
    {
        // Admin moderation lives in the admin console; an admin token must not
        // silently inherit employer capabilities on the employer surface.
        $admin = $this->admin();
        $job = $this->makeJob($this->employer()->company);

        $this->asApiUser($admin)
            ->deleteJson('/api/v1/employer/jobs/'.$job->slug)
            ->assertForbidden();
    }

    public function test_api_errors_are_returned_as_json_with_a_consistent_envelope(): void
    {
        $employer = $this->employer();

        // Validation failure
        $this->asApiUser($employer)
            ->postJson('/api/v1/employer/jobs', [])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['success', 'message', 'errors']);

        // Unauthenticated (drop the token set by asApiUser above, and clear the
        // resolved guard, which is otherwise reused for the rest of the test)
        $this->withoutHeader('Authorization');
        Auth::forgetGuards();

        $this->postJson('/api/v1/employer/jobs')
            ->assertStatus(401)
            ->assertJsonPath('success', false);

        // Not found
        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/applicants/424242')
            ->assertStatus(404)
            ->assertJsonPath('success', false);
    }

    public function test_validation_failure_returns_422_even_without_a_json_accept_header(): void
    {
        $employer = $this->employer();

        // ForceJsonResponse is not present in this framework version, so this
        // guards the shouldRenderJsonWhen contract in bootstrap/app.php: a
        // plain form-style post must not be answered with an HTML redirect.
        $response = $this->asApiUser($employer)
            ->post('/api/v1/employer/jobs', ['workplace' => 'remote']);

        $response->assertStatus(422);
        $this->assertStringContainsString('application/json', (string) $response->headers->get('Content-Type'));
    }
}
