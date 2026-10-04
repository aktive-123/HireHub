<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\OtpCode;
use App\Models\User;
use Tests\ApiTestCase;

class AuthTest extends ApiTestCase
{
    public function test_job_seeker_can_register(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'first_name' => 'Ada',
            'last_name' => 'Obi',
            'email' => 'ada@example.com',
            'phone' => '08012345678',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        // No token: until the emailed code is entered there is nothing proven
        // about the address, so the account is created pending and the client is
        // sent to the verification screen instead of a dashboard.
        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'ada@example.com')
            ->assertJsonPath('data.requires_verification', true)
            ->assertJsonPath('data.email', 'ada@example.com')
            ->assertJsonStructure(['data' => ['user', 'email', 'otp_expires_in_minutes', 'resend_cooldown_seconds']]);

        $this->assertArrayNotHasKey('token', $response->json('data'));

        $this->assertDatabaseHas('users', ['email' => 'ada@example.com', 'role' => UserRole::Seeker->value]);
        $this->assertDatabaseHas('profiles', ['user_id' => User::where('email', 'ada@example.com')->value('id')]);

        // Typed as a spaced local number, stored as canonical E.164.
        $this->assertDatabaseHas('users', ['email' => 'ada@example.com', 'phone' => '+2348012345678']);
        $this->assertDatabaseHas('profiles', [
            'user_id' => User::where('email', 'ada@example.com')->value('id'),
            'city' => 'Lagos',
            'state' => 'Lagos',
            'location' => 'Lagos, Lagos',
        ]);

        $this->assertDatabaseHas('otp_codes', [
            'email' => 'ada@example.com',
            'purpose' => OtpCode::PURPOSE_VERIFY,
            'consumed_at' => null,
        ]);
    }

    public function test_employer_can_register_with_company(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'role' => 'employer',
            'full_name' => 'David Okafor',
            'company_name' => 'Acme Tech',
            'work_email' => 'david@acme.com',
            'phone' => '+234 801 234 5678',
            'address_line' => '12 Admiralty Way, Lekki Phase 1',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.user.role', 'employer');

        $user = User::where('email', 'david@acme.com')->firstOrFail();
        $this->assertDatabaseHas('companies', [
            'user_id' => $user->id,
            'name' => 'Acme Tech',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'location' => 'Lagos, Lagos',
        ]);

        // The company's contact number lives on the account, normalised.
        $this->assertDatabaseHas('users', ['email' => 'david@acme.com', 'phone' => '+2348012345678']);
    }

    public function test_user_can_login_and_access_me(): void
    {
        $user = User::factory()->create(['email' => 'me@example.com', 'password' => 'secret123']);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'me@example.com',
            'password' => 'secret123',
        ])->assertOk()->assertJsonPath('data.user.name', $user->name);

        $token = $login->json('data.token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.role', 'seeker');
    }

    public function test_login_with_incorrect_credentials_fails(): void
    {
        User::factory()->create(['email' => 'me@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'me@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(401);
    }

    public function test_suspended_account_cannot_login(): void
    {
        User::factory()->create(['email' => 'banned@example.com', 'password' => 'secret123', 'status' => 'suspended']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'banned@example.com',
            'password' => 'secret123',
        ])->assertStatus(403);
    }

    public function test_duplicate_email_registration_fails(): void
    {
        User::factory()->create(['email' => 'ada@example.com']);

        $this->postJson('/api/v1/auth/register', [
            'first_name' => 'Ada',
            'last_name' => 'Obi',
            'email' => 'ada@example.com',
            'phone' => '08012345678',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_logout_revokes_token(): void
    {
        $user = $this->seeker();
        $this->asApiUser($user);

        $this->getJson('/api/v1/auth/me')->assertOk();
        $this->assertSame(1, $user->tokens()->count());

        $this->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_protected_route_requires_authentication(): void
    {
        $this->getJson('/api/v1/seeker/profile')->assertStatus(401);
    }
}
