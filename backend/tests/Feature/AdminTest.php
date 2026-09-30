<?php

namespace Tests\Feature;

use App\Enums\JobStatus;
use App\Models\Company;
use App\Models\User;
use Tests\ApiTestCase;

class AdminTest extends ApiTestCase
{
    public function test_non_admin_cannot_access_admin_endpoints(): void
    {
        $seeker = $this->asApiUser($this->seeker());
        $seeker->getJson('/api/v1/admin/dashboard')->assertStatus(403);

        $employer = $this->asApiUser($this->employer());
        $employer->getJson('/api/v1/admin/users')->assertStatus(403);
    }

    public function test_admin_dashboard_returns_stats(): void
    {
        $this->asApiUser($this->admin())
            ->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonStructure(['data' => ['stats']]);
    }

    public function test_admin_can_list_and_update_users(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($this->admin())
            ->getJson('/api/v1/admin/users?role=seeker')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->asApiUser($this->admin())
            ->patchJson('/api/v1/admin/users/'.$seeker->id.'/status', ['status' => 'suspended'])
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $seeker->id, 'status' => 'suspended']);
    }

    public function test_admin_cannot_suspend_another_admin(): void
    {
        $admin = $this->admin();

        $this->asApiUser($admin)
            ->patchJson('/api/v1/admin/users/'.$admin->id.'/status', ['status' => 'suspended'])
            ->assertStatus(403);
    }

    public function test_admin_can_moderate_jobs(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company, ['status' => JobStatus::Pending->value]);

        $this->asApiUser($this->admin())
            ->patchJson('/api/v1/admin/jobs/'.$job->slug.'/status', ['status' => 'open'])
            ->assertOk();

        $this->assertDatabaseHas('jobs', ['id' => $job->id, 'status' => 'open']);
    }

    public function test_admin_can_manage_categories(): void
    {
        $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/categories', ['name' => 'Marketing'])
            ->assertStatus(201);

        $this->assertDatabaseHas('categories', ['name' => 'Marketing']);
    }

    public function test_admin_skills_and_reports(): void
    {
        $admin = $this->admin();

        $this->asApiUser($admin)->getJson('/api/v1/admin/skills')->assertOk();
        $this->asApiUser($admin)->getJson('/api/v1/admin/activity-logs')->assertOk();
        $this->asApiUser($admin)->getJson('/api/v1/admin/reports')->assertOk();
        $this->asApiUser($admin)->getJson('/api/v1/admin/settings')->assertOk();
    }

    public function test_admin_can_update_settings(): void
    {
        $this->asApiUser($this->admin())
            ->patchJson('/api/v1/admin/settings', [
                'settings' => [
                    'general' => ['site_name' => 'HireHub Pro'],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('settings', ['group' => 'general', 'key' => 'site_name']);
    }

    public function test_admin_delete_user_deletes_account(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($this->admin())
            ->deleteJson('/api/v1/admin/users/'.$seeker->id)
            ->assertOk();

        $this->assertNull(User::find($seeker->id));
    }

    public function test_admin_can_read_a_single_application(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $application = $this->makeApplication($job, $this->seeker());

        $this->asApiUser($this->admin())
            ->getJson("/api/v1/admin/applications/{$application->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            // The resource deliberately exposes an opaque public reference
            // rather than the surrogate key.
            ->assertJsonPath('data.id', 'app-'.$application->id);
    }

    public function test_admin_can_advance_an_application_status(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $application = $this->makeApplication($job, $this->seeker(), ['status' => 'new']);

        $this->asApiUser($this->admin())
            ->patchJson("/api/v1/admin/applications/{$application->id}/status", ['status' => 'shortlisted'])
            ->assertOk();

        $this->assertSame('shortlisted', $application->refresh()->status->value);
    }

    public function test_admin_application_status_rejects_an_unknown_stage(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $application = $this->makeApplication($job, $this->seeker(), ['status' => 'new']);

        $this->asApiUser($this->admin())
            ->patchJson("/api/v1/admin/applications/{$application->id}/status", ['status' => 'hired-by-magic'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertSame('new', $application->refresh()->status->value);
    }

    public function test_non_admin_cannot_moderate_applications(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $application = $this->makeApplication($job, $this->seeker(), ['status' => 'new']);

        // An employer moderating their own pipeline uses their own scoped
        // route; they must not reach the platform-wide admin one.
        $this->asApiUser($employer)
            ->patchJson("/api/v1/admin/applications/{$application->id}/status", ['status' => 'hired'])
            ->assertForbidden();

        $this->asApiUser($this->seeker())
            ->getJson("/api/v1/admin/applications/{$application->id}")
            ->assertForbidden();

        $this->assertSame('new', $application->refresh()->status->value);
    }

    public function test_admin_can_create_a_company_without_an_owner(): void
    {
        $res = $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/companies', [
                'name' => 'Kaduna Steel Works',
                'industry' => 'Manufacturing',
                'location' => 'Kaduna, Nigeria',
                'website' => 'https://example.test',
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Kaduna Steel Works');

        // A company created by an admin has no owning account yet, which is
        // why companies.user_id is nullable.
        $this->assertNull($res->json('data.user_id'));

        $company = Company::where('name', 'Kaduna Steel Works')->firstOrFail();
        $this->assertNotSame('', $company->slug);
        // An admin must not be able to hand out the verified badge that the
        // verification flow owns.
        $this->assertFalse((bool) $company->is_verified);
        $this->assertSame('active', $company->status);
    }

    public function test_admin_can_create_a_company_owned_by_an_employer(): void
    {
        $employer = $this->employer();

        $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/companies', [
                'name' => 'Lagos Cloud Ltd',
                'user_id' => $employer->id,
            ])
            ->assertCreated();

        $this->assertSame($employer->id, Company::where('name', 'Lagos Cloud Ltd')->firstOrFail()->user_id);
    }

    public function test_company_owner_must_be_an_employer(): void
    {
        // A job seeker has no business owning a company record.
        $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/companies', [
                'name' => 'Wrong Owner Ltd',
                'user_id' => $this->seeker()->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('user_id');

        $this->assertDatabaseMissing('companies', ['name' => 'Wrong Owner Ltd']);
    }

    public function test_company_name_is_required(): void
    {
        $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/companies', ['industry' => 'Finance'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_admin_can_update_a_company_and_its_slug_follows_a_rename(): void
    {
        $employer = $this->employer();
        $original = $employer->company;

        $this->asApiUser($this->admin())
            ->putJson("/api/v1/admin/companies/{$original->slug}", [
                'name' => 'Renamed Employer Ltd',
                'industry' => 'Logistics',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed Employer Ltd');

        $original->refresh();
        $this->assertSame('logistics', strtolower($original->industry));
        // The slug has to keep addressing the same company after a rename.
        $this->assertStringContainsString('renamed-employer', $original->slug);
    }

    public function test_non_admin_cannot_create_or_edit_companies(): void
    {
        $company = $this->employer()->company;

        $this->asApiUser($this->employer())
            ->postJson('/api/v1/admin/companies', ['name' => 'Sneaky Ltd'])
            ->assertForbidden();

        $this->asApiUser($this->seeker())
            ->putJson("/api/v1/admin/companies/{$company->slug}", ['name' => 'Hijacked Ltd'])
            ->assertForbidden();

        $this->assertDatabaseMissing('companies', ['name' => 'Sneaky Ltd']);
        $this->assertNotSame('Hijacked Ltd', $company->refresh()->name);
    }
}
