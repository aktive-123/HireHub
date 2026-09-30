<?php

namespace Tests\Feature;

use Tests\ApiTestCase;

class PublicApiTest extends ApiTestCase
{
    public function test_public_resources_are_listable(): void
    {
        $company = $this->employer()->company;
        $this->makeJob($company);

        $this->getJson('/api/v1/health')->assertOk();

        $this->getJson('/api/v1/jobs')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/v1/companies')->assertOk();
        $this->getJson('/api/v1/categories')->assertOk();
    }

    public function test_job_detail_is_public(): void
    {
        $company = $this->employer()->company;
        $job = $this->makeJob($company);

        $this->getJson('/api/v1/jobs/'.$job->slug)
            ->assertOk()
            ->assertJsonPath('data.slug', $job->slug);
    }

    public function test_draft_jobs_are_hidden_from_public(): void
    {
        $company = $this->employer()->company;
        $draft = $this->makeJob($company, ['status' => 'draft']);
        $published = $this->makeJob($company, ['status' => 'open']);

        $response = $this->getJson('/api/v1/jobs')->assertOk();
        $jobs = $response->json('data');

        $this->assertNotContains($draft->slug, array_column($jobs, 'slug'));
        $this->assertContains($published->slug, array_column($jobs, 'slug'));
    }

    public function test_applications_endpoint_is_authenticated(): void
    {
        $this->getJson('/api/v1/applications')->assertStatus(401);
    }
}
