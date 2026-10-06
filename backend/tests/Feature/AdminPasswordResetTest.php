<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Mail\PasswordResetByAdminMail;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\ApiTestCase;

/**
 * The admin password reset, and the confinement it puts the account in.
 *
 * The properties asserted here are the ones that would quietly undo the
 * feature: a reset that leaves the old session alive is not a reset, a
 * "must change" flag the client is free to ignore is not enforcement, and an
 * admin able to reset another admin can take over an account that outranks
 * them.
 */
class AdminPasswordResetTest extends ApiTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The console's production mailer is real, but the reset notice is
        // delivered in-request, so a test that forgot Mail::fake() would try to
        // reach it. Failing loudly here beats a suite that passes on a
        // developer's machine and hangs on CI.
        Mail::fake();
        config(['mail.enabled' => true]);
    }

    public function test_an_admin_can_reset_a_seekers_password(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk()
            ->assertJsonStructure(['data' => ['temporary_password', 'notification_sent', 'user']]);

        $this->assertTrue($seeker->fresh()->requiresPasswordChange());
    }

    public function test_the_reset_password_it_returns_actually_works(): void
    {
        $seeker = $this->seeker();
        $oldHash = $seeker->password;

        $response = $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk();

        $temporary = $response->json('data.temporary_password');

        $this->assertIsString($temporary);
        $this->assertNotSame($oldHash, $seeker->fresh()->password);
        $this->assertTrue(Hash::check($temporary, $seeker->fresh()->password));
    }

    /**
     * The generated password has to satisfy the same rules the API enforces on
     * a user-chosen one, or the account would be handed a credential that
     * cannot be replaced by a compliant replacement.
     */
    public function test_the_generated_password_meets_the_configured_rules(): void
    {
        config(['security.password_min_length' => 12, 'security.password_max_length' => 72]);

        $seeker = $this->seeker();

        $temporary = $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->json('data.temporary_password');

        $this->assertGreaterThanOrEqual(12, mb_strlen($temporary));
        $this->assertLessThanOrEqual(72, mb_strlen($temporary));
    }

    /**
     * A reset that leaves the attacker's session alive has not fixed anything,
     * so every outstanding token has to go.
     */
    public function test_it_revokes_every_existing_session(): void
    {
        $seeker = $this->seeker();
        $seeker->issueToken('auth');
        $seeker->issueToken('auth');

        $this->assertSame(2, $seeker->tokens()->count());

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk();

        $this->assertSame(0, $seeker->fresh()->tokens()->count());
    }

    public function test_it_emails_the_user_a_reset_link_but_never_the_password(): void
    {
        $seeker = $this->seeker();

        $temporary = $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->json('data.temporary_password');

        Mail::assertSent(PasswordResetByAdminMail::class, function (PasswordResetByAdminMail $mail) use ($seeker, $temporary): bool {
            $this->assertTrue($mail->hasTo($seeker->email));

            // The rendered message must not contain the credential. A password
            // in a mailbox is a password nobody can revoke.
            $this->assertStringNotContainsString($temporary, $mail->render());
            $this->assertStringContainsString('/reset-password', $mail->render());

            return true;
        });
    }

    public function test_it_records_who_reset_whose_password(): void
    {
        $admin = $this->admin();
        $seeker = $this->seeker();

        $this->asApiUser($admin)
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk();

        $log = ActivityLog::where('action', 'admin.password.reset')->sole();

        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame($seeker->id, $log->target_id);
        $this->assertSame('warning', $log->level);
    }

    /**
     * A mail outage must not undo a reset that already succeeded. Reporting the
     * failure in the response is what lets the console tell the admin to hand
     * the temporary password over instead.
     */
    public function test_a_mail_failure_is_reported_rather_than_thrown(): void
    {
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('provider down'));

        $seeker = $this->seeker();

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk()
            ->assertJsonPath('data.notification_sent', false);

        // The reset itself still happened.
        $this->assertTrue($seeker->fresh()->requiresPasswordChange());
    }

    // --- Confinement -------------------------------------------------------

    public function test_a_reset_account_is_confined_to_the_change_screen(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk();

        $this->asApiUser($seeker->fresh())
            ->getJson('/api/v1/seeker/dashboard')
            ->assertStatus(403)
            ->assertJsonPath('data.must_change_password', true);
    }

    /**
     * The confinement has to be server-side. A client that ignores the flag —
     * a stale tab, a curl call, the mobile app — must still be refused.
     */
    public function test_the_flag_cannot_be_cleared_by_the_user_themselves(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk();

        // No settings endpoint accepts it, because it is not fillable.
        $this->asApiUser($seeker->fresh())
            ->patchJson('/api/v1/settings', ['must_change_password' => false])
            ->assertStatus(403);

        $this->assertTrue($seeker->fresh()->requiresPasswordChange());
    }

    public function test_changing_the_password_releases_the_account(): void
    {
        $seeker = $this->seeker();

        $temporary = $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->json('data.temporary_password');

        $this->asApiUser($seeker->fresh())
            ->patchJson('/api/v1/auth/password', [
                'current_password' => $temporary,
                'password' => 'a-brand-new-password',
                'password_confirmation' => 'a-brand-new-password',
            ])
            ->assertOk();

        $this->assertFalse($seeker->fresh()->requiresPasswordChange());

        $this->asApiUser($seeker->fresh())
            ->getJson('/api/v1/seeker/dashboard')
            ->assertOk();
    }

    /**
     * A wrong current password must not clear the flag, or the requirement
     * becomes advisory: keep guessing until one lands.
     */
    public function test_a_failed_password_change_keeps_the_account_confined(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk();

        $this->asApiUser($seeker->fresh())
            ->patchJson('/api/v1/auth/password', [
                'current_password' => 'not-the-temporary-one',
                'password' => 'a-brand-new-password',
                'password_confirmation' => 'a-brand-new-password',
            ])
            ->assertStatus(422);

        $this->assertTrue($seeker->fresh()->requiresPasswordChange());
    }

    /**
     * Signing out has to stay possible, or a user who cannot remember the
     * temporary password has no way out of the account at all.
     */
    public function test_the_account_can_still_sign_out_while_confined(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk();

        $this->asApiUser($seeker->fresh())
            ->postJson('/api/v1/auth/logout')
            ->assertOk();
    }

    /**
     * Signing in still works — the whole point is that a reset does not lock
     * anybody out — but the response has to say the account is confined, or
     * the client has no reason to show the change screen.
     */
    public function test_login_still_succeeds_and_flags_the_requirement(): void
    {
        $seeker = $this->seeker();

        $temporary = $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->json('data.temporary_password');

        $this->postJson('/api/v1/auth/login', [
            'email' => $seeker->email,
            'password' => $temporary,
        ])
            ->assertOk()
            ->assertJsonPath('data.must_change_password', true)
            ->assertJsonPath('data.user.must_change_password', true);
    }

    // --- Authorization -----------------------------------------------------

    public function test_a_seeker_cannot_reset_anybody(): void
    {
        $victim = $this->employer();

        $this->asApiUser($this->seeker())
            ->postJson("/api/v1/admin/users/{$victim->id}/reset-password")
            ->assertStatus(403);

        $this->assertFalse($victim->fresh()->requiresPasswordChange());
    }

    public function test_an_employer_cannot_reset_anybody(): void
    {
        $victim = $this->seeker();

        $this->asApiUser($this->employer())
            ->postJson("/api/v1/admin/users/{$victim->id}/reset-password")
            ->assertStatus(403);

        $this->assertFalse($victim->fresh()->requiresPasswordChange());
    }

    public function test_an_anonymous_caller_cannot_reset_anybody(): void
    {
        $victim = $this->seeker();

        $this->postJson("/api/v1/admin/users/{$victim->id}/reset-password")
            ->assertStatus(401);

        $this->assertFalse($victim->fresh()->requiresPasswordChange());
    }

    /**
     * Resetting another admin would let a lesser admin take over an account
     * that outranks them, taking its sessions and history with it. Admins have
     * a supported self-service route instead.
     */
    public function test_an_admin_cannot_reset_another_admin(): void
    {
        $victim = $this->admin();

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$victim->id}/reset-password")
            ->assertStatus(403);

        $this->assertFalse($victim->fresh()->requiresPasswordChange());
    }

    /**
     * Nor their own, through the console: an admin resetting themselves gets no
     * forced-change confinement, so the "temporary" password would quietly
     * become permanent.
     */
    public function test_an_admin_cannot_reset_themselves_through_the_console(): void
    {
        $admin = $this->admin();

        $this->asApiUser($admin)
            ->postJson("/api/v1/admin/users/{$admin->id}/reset-password")
            ->assertStatus(403);
    }

    /**
     * A suspended account is not rescued by a reset, and the status is left
     * exactly as it was.
     */
    public function test_a_reset_does_not_reactivate_a_suspended_account(): void
    {
        $seeker = $this->seeker();
        $seeker->forceFill(['status' => AccountStatus::Suspended])->save();

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$seeker->id}/reset-password")
            ->assertOk();

        $this->assertSame(AccountStatus::Suspended, $seeker->fresh()->status);
    }

    public function test_it_works_for_an_employer_too(): void
    {
        $employer = $this->employer();

        $this->asApiUser($this->admin())
            ->postJson("/api/v1/admin/users/{$employer->id}/reset-password")
            ->assertOk()
            ->assertJsonPath('data.user.role', UserRole::Employer->value);
    }
}
