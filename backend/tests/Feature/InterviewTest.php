<?php

namespace Tests\Feature;

use App\Models\Interview;
use Tests\ApiTestCase;

class InterviewTest extends ApiTestCase
{
    public function test_employer_can_schedule_an_interview_for_an_applicant(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $seeker = $this->seeker();
        $application = $this->makeApplication($job, $seeker);

        $response = $this->asApiUser($employer)->postJson('/api/v1/employer/interviews', [
            'application_id' => $application->id,
            'scheduled_at' => now()->addDays(3)->toDateTimeString(),
            'mode' => 'video',
            'link' => 'https://meet.example.com/x',
            'notes' => 'Technical round',
        ])->assertStatus(201);

        $this->assertDatabaseHas('interviews', ['job_id' => $job->id, 'seeker_id' => $seeker->id]);
        // Scheduling flows through to the application pipeline.
        $this->assertDatabaseHas('applications', ['id' => $application->id, 'status' => 'interview']);

        // The seeker should now have a notification and see the interview.
        $this->asApiUser($seeker)->getJson('/api/v1/seeker/interviews')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_employer_cannot_schedule_interview_on_another_companys_application(): void
    {
        $owner = $this->employer();
        $job = $this->makeJob($owner->company);
        $seeker = $this->seeker();
        $application = $this->makeApplication($job, $seeker);
        $attacker = $this->employer();

        $this->asApiUser($attacker)->postJson('/api/v1/employer/interviews', [
            'application_id' => $application->id,
            'scheduled_at' => now()->addDays(3)->toDateTimeString(),
            'mode' => 'video',
        ])->assertStatus(403);
    }

    public function test_employer_can_advance_interview_status(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $seeker = $this->seeker();
        $application = $this->makeApplication($job, $seeker);

        $interview = $this->createInterview($employer, $job, $seeker, $application);

        $this->asApiUser($employer)
            ->patchJson('/api/v1/employer/interviews/'.$interview->id.'/status', ['status' => 'confirmed'])
            ->assertOk();

        $this->assertDatabaseHas('interviews', ['id' => $interview->id, 'status' => 'confirmed']);
    }

    public function test_seeker_sees_only_own_interviews(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company);
        $seeker = $this->seeker();
        $application = $this->makeApplication($job, $seeker);
        $this->createInterview($employer, $job, $seeker, $application);

        $other = $this->seeker();
        $this->asApiUser($other)->getJson('/api/v1/seeker/interviews')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_interview_requires_authentication(): void
    {
        $this->getJson('/api/v1/employer/interviews')->assertStatus(401);
    }

    private function createInterview($employer, $job, $seeker, $application)
    {
        $interview = Interview::factory()->create([
            'job_id' => $job->id,
            'application_id' => $application->id,
            'seeker_id' => $seeker->id,
            'company_id' => $employer->company->id,
            'created_by' => $employer->id,
            'status' => 'scheduled',
        ]);

        $application->update(['status' => 'interview']);

        return $interview;
    }
}
