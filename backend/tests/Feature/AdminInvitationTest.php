<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Mail\AdminInviteMail;
use App\Models\AdminInvitation;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;
use Tests\ApiTestCase;

/**
 * Invite-only admin creation.
 *
 * The properties asserted here are the ones that would quietly undo the
 * feature: an invitation endpoint any signed-in member can call is a
 * privilege-escalation hole, a link that works twice is a second account
 * nobody audited, and a token stored in the clear turns a database dump into
 * a set of live admin credentials. The public half must also work without a
 * session — the account does not exist yet — which is the whole reason the
 * token, and not an authorisation header, is what these routes trust.
 */
class AdminInvitationTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Invitation mail is delivered in-request, so a test that forgot
        // Mail::fake() would try to reach the real relay. Failing loudly here
        // beats a suite that hangs on a developer's network.
        Mail::fake();
        config(['mail.enabled' => true]);
    }

    public function test_an_admin_can_invite_an_address_and_the_link_resolves(): void
    {
        $response = $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/invitations', ['email' => 'New.Admin@Example.com'])
            ->assertCreated()
            ->assertJsonStructure([
                'data' => ['invitation' => ['id', 'email', 'expires_at'], 'invite_url', 'notification_sent'],
            ]);

        // The console normalises and shows the address it actually wrote.
        $this->assertSame('new.admin@example.com', $response->json('data.invitation.email'));
        $this->assertTrue($response->json('data.notification_sent'));

        $token = $this->tokenFrom($response->json('data.invite_url'));

        Mail::assertSent(AdminInviteMail::class, fn (AdminInviteMail $mail): bool => $mail->hasTo('new.admin@example.com')
                && str_contains($mail->inviteUrl, $token));

        // The link answers for the invitee, who has no token of their own yet.
        $this->getJson('/api/v1/admin-invitations/'.$token)
            ->assertOk()
            ->assertJsonPath('data.email', 'new.admin@example.com');
    }

    public function test_the_link_creates_an_active_admin_with_a_working_login(): void
    {
        $token = $this->tokenFrom($this->invite('invitee@example.com')->json('data.invite_url'));

        $accept = $this->postJson('/api/v1/admin-invitations/'.$token.'/accept', [
            'name' => 'New Admin',
            'password' => 'correct-horse-battery-staple',
            'password_confirmation' => 'correct-horse-battery-staple',
        ])
            ->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'role', 'status']]])
            ->assertJsonPath('data.user.role', 'admin')
            ->assertJsonPath('data.user.status', 'active');

        $user = User::where('email', 'invitee@example.com')->firstOrFail();
        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertSame(AccountStatus::Active, $user->status);
        $this->assertNotNull($user->email_verified_at);

        // A real password, not a placeholder: the account must authenticate
        // through the ordinary login path like any other.
        $this->postJson('/api/v1/auth/login', [
            'email' => 'invitee@example.com',
            'password' => 'correct-horse-battery-staple',
        ])->assertOk();

        // And the token the accept endpoint returned is authorised for the
        // console — the session it hands over is real, not decorative.
        $this->withHeader('Authorization', 'Bearer '.$accept->json('data.token'));
        Auth::forgetGuards();
        $this->getJson('/api/v1/admin/users')->assertOk();
    }

    public function test_the_invitation_is_single_use(): void
    {
        $token = $this->tokenFrom($this->invite('once@example.com')->json('data.invite_url'));
        $payload = [
            'name' => 'Once Admin',
            'password' => 'correct-horse-battery-staple',
            'password_confirmation' => 'correct-horse-battery-staple',
        ];

        $this->postJson('/api/v1/admin-invitations/'.$token.'/accept', $payload)->assertOk();
        $this->postJson('/api/v1/admin-invitations/'.$token.'/accept', $payload)->assertStatus(410);
        $this->getJson('/api/v1/admin-invitations/'.$token)->assertStatus(410);

        $this->assertSame(1, User::where('email', 'once@example.com')->count());
    }

    public function test_an_expired_invitation_is_refused(): void
    {
        $token = $this->expiredInvitation('stale@example.com');

        $this->getJson('/api/v1/admin-invitations/'.$token)->assertStatus(410);
        $this->postJson('/api/v1/admin-invitations/'.$token.'/accept', [
            'name' => 'Stale Admin',
            'password' => 'correct-horse-battery-staple',
            'password_confirmation' => 'correct-horse-battery-staple',
        ])->assertStatus(410);

        $this->assertDatabaseMissing('users', ['email' => 'stale@example.com']);
    }

    public function test_an_unknown_or_malformed_token_is_refused(): void
    {
        // A wrong-but-well-formed token and a garbage path segment must be
        // indistinguishable: a distinct "not found vs expired" answer would
        // let a caller probe which tokens ever existed.
        $this->getJson('/api/v1/admin-invitations/'.str_repeat('a', 64))->assertStatus(404);
        $this->getJson('/api/v1/admin-invitations/not-a-token')->assertStatus(404);
        $this->postJson('/api/v1/admin-invitations/'.str_repeat('b', 64).'/accept', [
            'name' => 'Nobody',
            'password' => 'correct-horse-battery-staple',
            'password_confirmation' => 'correct-horse-battery-staple',
        ])->assertStatus(404);
    }

    public function test_reinviting_the_same_address_kills_the_previous_link(): void
    {
        $first = $this->tokenFrom($this->invite('twice@example.com')->json('data.invite_url'));
        $second = $this->tokenFrom($this->invite('twice@example.com')->json('data.invite_url'));

        // Only one live row: an admin who re-sent the invite must not leave an
        // older, unrevoked link lying around beside it.
        $this->assertSame(1, AdminInvitation::whereNull('accepted_at')->count());

        $this->getJson('/api/v1/admin-invitations/'.$first)->assertStatus(404);
        $this->getJson('/api/v1/admin-invitations/'.$second)->assertOk();
    }

    public function test_an_address_with_an_account_cannot_be_invited(): void
    {
        $existing = $this->seeker()->email;

        $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/invitations', ['email' => $existing])
            ->assertStatus(422);

        Mail::assertNothingSent();
    }

    public function test_a_non_admin_cannot_list_issue_or_revoke_invitations(): void
    {
        $member = $this->seeker();
        $invitation = $this->makeInvitation('guarded@example.com');

        $this->asApiUser($member)->getJson('/api/v1/admin/invitations')->assertForbidden();
        $this->asApiUser($member)->postJson('/api/v1/admin/invitations', ['email' => 'x@example.com'])->assertForbidden();
        $this->asApiUser($member)->deleteJson('/api/v1/admin/invitations/'.$invitation->id)->assertForbidden();
    }

    public function test_revoking_a_link_kills_it_before_use(): void
    {
        $admin = $this->admin();
        $raw = AdminInvitation::generateToken();
        $invitation = $this->makeInvitation('revoked@example.com', $admin, $raw);

        $this->getJson('/api/v1/admin-invitations/'.$raw)->assertOk();

        $this->asApiUser($admin)
            ->deleteJson('/api/v1/admin/invitations/'.$invitation->id)
            ->assertOk();

        $this->getJson('/api/v1/admin-invitations/'.$raw)->assertStatus(404);
        $this->assertDatabaseMissing('users', ['email' => 'revoked@example.com']);
    }

    public function test_a_weak_password_is_rejected_at_accept(): void
    {
        $token = $this->tokenFrom($this->invite('weak@example.com')->json('data.invite_url'));

        $this->postJson('/api/v1/admin-invitations/'.$token.'/accept', [
            'name' => 'Weak Password',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertStatus(422);

        $this->assertDatabaseMissing('users', ['email' => 'weak@example.com']);
    }

    public function test_invite_mail_goes_over_the_brevo_api_when_a_key_is_configured(): void
    {
        // Production has BREVO_API_KEY; with it set the invitation must ride
        // the same HTTPS transport the OTP codes use rather than the mailer,
        // and must not additionally fall through to the mailer.
        config(['services.brevo.api_key' => 'test-key']);
        Http::fake(['api.brevo.com/*' => Http::response(['message' => 'Queued'], 201)]);

        $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/invitations', ['email' => 'api-path@example.com'])
            ->assertCreated()
            ->assertJsonPath('data.notification_sent', true);

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://api.brevo.com/v3/smtp/email'
                && $request['to'][0]['email'] === 'api-path@example.com'
                && str_contains((string) ($request['htmlContent'] ?? ''), '/admin-invite/')
                // The text alternative carries the link too — the whole
                // point of the message has to survive HTML stripping.
                && str_contains((string) ($request['textContent'] ?? ''), '/admin-invite/');
        });
        Mail::assertNothingSent();
    }

    public function test_invite_mail_reports_failure_without_failing_the_invitation(): void
    {
        config(['services.brevo.api_key' => 'test-key']);
        Http::fake(['api.brevo.com/*' => Http::response(['message' => 'Forbidden'], 403)]);

        // The invitation and its copyable link exist regardless: the mailer
        // being down must not be able to undo an act the admin already took.
        $response = $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/invitations', ['email' => 'down-api@example.com'])
            ->assertCreated()
            ->assertJsonPath('data.notification_sent', false);

        $this->assertNotEmpty($response->json('data.invite_url'));
    }

    // -----------------------------------------------------------------

    /** Issue an invitation as a signed-in admin and return the response. */
    private function invite(string $email): TestResponse
    {
        return $this->asApiUser($this->admin())
            ->postJson('/api/v1/admin/invitations', ['email' => $email]);
    }

    /**
     * Pull the raw 64-hex token out of the one URL that ever contains it.
     *
     * The API returns it exactly once, at creation; everything afterwards
     * works from its hash, which is why the test has to capture it here.
     */
    private function tokenFrom(string $url): string
    {
        $this->assertSame(
            1,
            preg_match('#/admin-invite/([a-f0-9]{64})#', $url, $matches),
            "Expected an invitation URL carrying a 64-hex token, got: {$url}",
        );

        return $matches[1];
    }

    /** A live invitation row, without going through the endpoint. */
    private function makeInvitation(string $email, ?User $admin = null, ?string $rawToken = null): AdminInvitation
    {
        $admin ??= $this->admin();

        return AdminInvitation::create([
            'email' => $email,
            'token_hash' => hash('sha256', $rawToken ?? AdminInvitation::generateToken()),
            'invited_by' => $admin->id,
            'expires_at' => now()->addDays(AdminInvitation::TTL_DAYS),
        ]);
    }

    /** An already-lapsed invitation; returns its raw token. */
    private function expiredInvitation(string $email): string
    {
        $raw = AdminInvitation::generateToken();

        AdminInvitation::create([
            'email' => $email,
            'token_hash' => hash('sha256', $raw),
            'invited_by' => $this->admin()->id,
            'expires_at' => now()->subDay(),
        ]);

        return $raw;
    }
}
