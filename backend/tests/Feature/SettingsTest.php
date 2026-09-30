<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\ApiTestCase;

/**
 * Account settings.
 *
 * These endpoints exist because both settings screens previously reported a
 * successful save while persisting nothing, so the tests here are mostly about
 * proving the write actually reaches the database.
 */
class SettingsTest extends ApiTestCase
{
    public function test_settings_require_authentication(): void
    {
        $this->getJson('/api/v1/settings')->assertUnauthorized();
        $this->patchJson('/api/v1/settings', ['timezone' => 'UTC'])->assertUnauthorized();
        $this->patchJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertUnauthorized();
    }

    public function test_settings_default_shape_for_a_new_account(): void
    {
        $user = $this->seeker();

        $this->asApiUser($user)
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.timezone', 'UTC')
            ->assertJsonPath('data.two_factor_enabled', false)
            ->assertJsonPath('data.email_preferences', [])
            ->assertJsonPath('data.notification_preferences', [])
            ->assertJsonPath('data.privacy_preferences', []);
    }

    public function test_user_can_persist_timezone_and_preference_toggles(): void
    {
        $user = $this->seeker();

        $payload = [
            'timezone' => 'Africa/Lagos',
            'email_preferences' => ['jobs' => true, 'applications' => false],
            'notification_preferences' => ['interviews' => true],
            'privacy_preferences' => ['profile' => 'hidden'],
        ];

        $this->asApiUser($user)
            ->patchJson('/api/v1/settings', $payload)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.timezone', 'Africa/Lagos');

        $user->refresh();

        $this->assertSame('Africa/Lagos', $user->timezone);
        $this->assertSame(['jobs' => true, 'applications' => false], $user->email_preferences);
        $this->assertSame(['interviews' => true], $user->notification_preferences);
        $this->assertSame(['profile' => 'hidden'], $user->privacy_preferences);
    }

    public function test_empty_preference_groups_are_returned_as_objects(): void
    {
        // An empty PHP array would encode as [], and the SPA would then read
        // `undefined` when the user toggles the first checkbox.
        $this->asApiUser($this->seeker())
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonCount(0, 'data.email_preferences')
            ->assertJsonStructure([
                'data' => [
                    'email_preferences' => [],
                    'notification_preferences' => [],
                    'privacy_preferences' => [],
                ],
            ]);
    }

    public function test_an_unknown_privacy_visibility_is_rejected(): void
    {
        $user = $this->seeker();

        $this->asApiUser($user)
            ->patchJson('/api/v1/settings', ['privacy_preferences' => ['profile' => 'invisible-to-nobody']])
            ->assertStatus(422)
            ->assertJsonValidationErrors('privacy_preferences.profile');
    }

    public function test_both_consoles_privacy_wording_is_accepted(): void
    {
        // The seeker console labels the middle option "recruiters" and the
        // employer console labels it "seekers"; they are the same visibility.
        $this->asApiUser($this->seeker())
            ->patchJson('/api/v1/settings', ['privacy_preferences' => ['profile' => 'seekers']])
            ->assertOk()
            ->assertJsonPath('data.privacy_preferences.profile', 'seekers');

        $this->asApiUser($this->employer())
            ->patchJson('/api/v1/settings', ['privacy_preferences' => ['profile' => 'recruiters']])
            ->assertOk()
            ->assertJsonPath('data.privacy_preferences.profile', 'recruiters');
    }

    public function test_settings_accepts_every_role(): void
    {
        foreach ([$this->seeker(), $this->employer(), $this->admin()] as $index => $user) {
            $this->asApiUser($user)
                ->patchJson('/api/v1/settings', ['timezone' => 'UTC'])
                ->assertOk();

            $this->assertSame('UTC', $user->refresh()->timezone, "role #$index could not save settings");
        }
    }

    public function test_an_unrecognised_timezone_is_rejected(): void
    {
        $user = $this->seeker();

        $this->asApiUser($user)
            ->patchJson('/api/v1/settings', ['timezone' => 'Mars/Olympus_Mons'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('timezone');

        $this->assertNotSame('Mars/Olympus_Mons', $user->refresh()->timezone);
    }

    public function test_settings_cannot_escalate_privileges(): void
    {
        $user = $this->seeker();

        // role/status are privilege columns and are never fillable; this locks
        // in that a settings write cannot promote a seeker to admin.
        $this->asApiUser($user)
            ->patchJson('/api/v1/settings', [
                'role' => 'admin',
                'status' => 'active',
            ])
            ->assertOk();

        $this->assertSame('seeker', $user->refresh()->role->value);
    }

    public function test_password_change_requires_the_current_password(): void
    {
        $user = $this->seeker();

        $this->asApiUser($user)
            ->patchJson('/api/v1/auth/password', [
                'current_password' => 'definitely-not-the-password',
                'password' => 'brand-new-password-1',
                'password_confirmation' => 'brand-new-password-1',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('current_password');

        // The original password must still work, i.e. nothing was written.
        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_password_change_updates_the_hash_and_keeps_the_current_session(): void
    {
        $user = $this->seeker();
        $this->assertTrue(Hash::check('password', $user->password));

        // asApiUser mints the token the PATCH below will authenticate with and
        // sets the Authorization header, so it is called exactly once: a second
        // call would add a third token and make the counts meaningless.
        $this->asApiUser($user);

        $otherSession = $user->createToken('other-device', ['seeker'])->plainTextToken;
        $this->assertSame(2, $user->tokens()->count());

        $this->patchJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'brand-new-password-1',
            'password_confirmation' => 'brand-new-password-1',
        ])
            ->assertOk();

        $this->assertTrue(Hash::check('brand-new-password-1', $user->refresh()->password));

        // The other device is signed out, but the token that made the request
        // survives so the user is not logged out of the tab they are using.
        $this->assertSame(1, $user->tokens()->count());
        $this->assertNotNull(
            $user->tokens()->first(),
            'the current session token should survive its own password change'
        );

        // The revoked token must be rejected. forgetGuards() is required
        // because the guard caches the previously resolved user for the rest
        // of the test; without it this would still pass the deleted token.
        $this->withHeader('Authorization', 'Bearer '.$otherSession);
        Auth::forgetGuards();

        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_new_password_must_differ_from_the_current_one(): void
    {
        $user = $this->seeker();

        $this->asApiUser($user)
            ->patchJson('/api/v1/auth/password', [
                'current_password' => 'password',
                'password' => 'password',
                'password_confirmation' => 'password',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_deactivating_revokes_every_session(): void
    {
        $user = $this->seeker();

        $this->asApiUser($user)
            ->postJson('/api/v1/account/deactivate')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame('suspended', $user->refresh()->status->value);
        $this->assertSame(
            0,
            $user->tokens()->count(),
            'a deactivated account must not keep usable sessions'
        );

        // The account can no longer sign in, and the answer must not reveal
        // more than "these credentials are not valid right now".
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertStatus(403);
    }

    public function test_reactivating_an_active_account_is_a_no_op(): void
    {
        $user = $this->seeker();

        $this->asApiUser($user)
            ->postJson('/api/v1/account/reactivate')
            ->assertOk();

        $this->assertSame('active', $user->refresh()->status->value);
    }
}
