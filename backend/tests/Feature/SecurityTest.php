<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\OtpCode;
use App\Models\User;
use App\Support\Otp;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use RuntimeException;
use Tests\ApiTestCase;
use Tests\InteractsWithOtp;
use UnexpectedValueException;

/**
 * Regression cover for the Stage 15 hardening and the one-time-password
 * rework that replaced the old verification link.
 *
 * Every test names the specific attack its control prevents, so a later
 * refactor cannot drop the protection while the suite still reports green.
 */
class SecurityTest extends ApiTestCase
{
    use InteractsWithOtp;

    /**
     * Authenticate as a raw bearer token.
     *
     * `Auth::forgetGuards()` is not optional here: the application instance is
     * reused across requests inside a single test, so the guard keeps the
     * identity it resolved earlier and a revoked token would still appear to
     * work.
     */
    private function asTokenUser(string $token): static
    {
        $this->withHeader('Authorization', 'Bearer '.$token);

        Auth::forgetGuards();

        return $this;
    }

    /** Bytes finfo reads as application/pdf, which is the only real check. */
    private const PDF_BYTES = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n%%EOF\n";

    // --- Response headers ------------------------------------------------

    public function test_api_responses_carry_hardening_headers(): void
    {
        $this->getJson('/api/v1/jobs')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', config('security.referrer_policy'))
            ->assertHeader('Permissions-Policy', config('security.permissions_policy'))
            // The legacy auditor was itself exploitable; browsers ignore it.
            ->assertHeader('X-XSS-Protection', '0');
    }

    public function test_server_fingerprint_header_is_removed(): void
    {
        // Removed both off the response and with header_remove(), because PHP's
        // own `expose_php` setting emits it at the SAPI level, below anything
        // the framework can see or override.
        $this->assertFalse($this->getJson('/api/v1/jobs')->assertOk()->headers->has('X-Powered-By'));
    }

    public function test_hsts_is_withheld_on_a_plain_http_local_server(): void
    {
        // Pinning localhost to HTTPS would break Vite HMR and ordinary browsing
        // until the browser cache expired, so HSTS waits for real TLS.
        $this->app['env'] = 'local';

        $this->getJson('/api/v1/jobs')
            ->assertOk()
            ->assertHeaderMissing('Strict-Transport-Security');
    }

    public function test_hsts_is_sent_outside_local(): void
    {
        $this->app['env'] = 'production';

        $this->getJson('/api/v1/jobs')
            ->assertOk()
            ->assertHeader('Strict-Transport-Security', 'max-age='.config('security.hsts_max_age').'; includeSubDomains');
    }

    public function test_internal_failures_never_leak_details(): void
    {
        // A deployed APP_DEBUG left on is a routine mistake that hands every
        // visitor a stack trace, a connection string and the file layout.
        config(['app.debug' => false, 'security.expose_debug' => false]);

        $this->app['router']->get('/api/v1/__security-probe', function () {
            throw new RuntimeException(
                'SQLSTATE[HY000] [2002] Connection refused for user root at /var/www/app/config/database.php:42'
            );
        });

        $body = $this->getJson('/api/v1/__security-probe')->assertStatus(500)->getContent();

        foreach (['SQLSTATE', '2002', 'Connection refused', 'database.php', 'vendor/laravel'] as $leak) {
            $this->assertStringNotContainsString($leak, (string) $body);
        }
    }

    // --- Error envelope --------------------------------------------------

    public function test_validation_failures_use_the_shared_envelope(): void
    {
        $this->postJson('/api/v1/auth/login', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            // `data` is dropped when null rather than serialised, so the keys
            // guaranteed on every error are the three below.
            ->assertJsonStructure(['success', 'message', 'errors']);
    }

    public function test_an_unauthenticated_request_is_401_not_a_redirect(): void
    {
        // A 302 to a login page would hand the SPA HTML where it expected JSON.
        $this->getJson('/api/v1/seeker/dashboard')->assertStatus(401);
    }

    public function test_an_unknown_route_returns_a_json_404(): void
    {
        $this->getJson('/api/v1/does-not-exist')
            ->assertStatus(404)
            ->assertJsonPath('success', false);
    }

    // --- Privilege escalation --------------------------------------------

    public function test_privilege_columns_are_not_mass_assignable(): void
    {
        $this->assertNotContains('role', (new User)->getFillable());
        $this->assertNotContains('status', (new User)->getFillable());
        $this->assertNotContains('email_verified_at', (new User)->getFillable());

        $user = User::create([
            'name' => 'Escalation',
            'email' => 'escalation@example.com',
            'password' => 'secret123',
            'role' => 'admin',
            'status' => 'suspended',
            'email_verified_at' => now(),
        ]);

        // `create()` is guarded, so the privilege columns keep their database
        // defaults instead of being taken from the payload. Refreshed first,
        // because those defaults live in the database and not on the instance
        // that was just constructed.
        $user->refresh();

        $this->assertSame(UserRole::Seeker, $user->role);
        $this->assertSame(AccountStatus::Active, $user->status);
        $this->assertNull($user->email_verified_at);
    }

    public function test_registration_cannot_mint_an_admin(): void
    {
        // Without the allowlist this would create a privileged account with a
        // single request and no email verification to stop it.
        $this->postJson('/api/v1/auth/register', [
            'first_name' => 'Mallory',
            'last_name' => 'Admin',
            'email' => 'mallory@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'role' => 'admin',
        ])->assertStatus(422)->assertJsonValidationErrors('role');

        $this->assertDatabaseMissing('users', ['email' => 'mallory@example.com']);
    }

    public function test_a_deployer_cannot_mark_their_own_job_as_verified_or_featured(): void
    {
        $employer = $this->employer();
        $job = $this->makeJob($employer->company, ['is_verified' => false, 'is_featured' => false]);

        $this->asApiUser($employer)->putJson("/api/v1/employer/jobs/{$job->slug}", [
            'title' => 'Senior Frontend Engineer',
            'workplace' => $job->workplace,
            'employment_type' => $job->employment_type,
            'description' => $job->description,
            'is_verified' => true,
            'is_featured' => true,
        ])->assertOk();

        $job->refresh();

        // The legitimate edit landed, so this is not passing by no-op.
        $this->assertSame('Senior Frontend Engineer', $job->title);

        // The two badges are not in the validation rules, so they never reach
        // the model: a signup cannot buy its own verified checkmark.
        $this->assertFalse($job->is_verified);
        $this->assertFalse($job->is_featured);
    }

    public function test_settings_cannot_escalate_privileges(): void
    {
        $user = $this->seeker();

        $this->asApiUser($user)->patchJson('/api/v1/settings', [
            'name' => 'Legitimate Rename',
            'timezone' => 'Africa/Lagos',
            'role' => 'admin',
            'status' => 'active',
        ])->assertOk();

        $user->refresh();

        $this->assertSame('Legitimate Rename', $user->name);
        $this->assertSame('Africa/Lagos', $user->timezone);
        $this->assertSame(UserRole::Seeker, $user->role);
    }

    // --- Login lockout ---------------------------------------------------

    public function test_repeated_failures_lock_the_account_out(): void
    {
        $user = $this->seeker(['password' => Hash::make('secret123')]);

        for ($i = 0; $i < (int) config('security.lockout_attempts'); $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong'])
                ->assertStatus(401);
        }

        // The correct password is refused too, which is the point of the lock.
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertStatus(401);
    }

    public function test_the_lockout_is_indistinguishable_from_a_wrong_password(): void
    {
        $user = $this->seeker(['password' => Hash::make('secret123')]);

        for ($i = 0; $i < (int) config('security.lockout_attempts'); $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong'])
                ->assertStatus(401);
        }

        $locked = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertStatus(401);
        $wrong = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'also-wrong'])
            ->assertStatus(401);

        // A different status, message or Retry-After presence here would confirm
        // the account exists and hand an attacker a free enumeration oracle.
        $this->assertSame($wrong->json(), $locked->json());
    }

    public function test_a_successful_login_clears_the_failure_counter(): void
    {
        $user = $this->seeker(['password' => Hash::make('secret123')]);

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'nope'])->assertStatus(401);
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'nope'])->assertStatus(401);

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'secret123'])->assertOk();

        // The full allowance is restored, not merely whatever was left over.
        for ($i = 0; $i < (int) config('security.lockout_attempts') - 1; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'nope'])
                ->assertStatus(401);
        }

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'secret123'])->assertOk();
    }

    public function test_a_suspended_account_cannot_sign_in(): void
    {
        $user = $this->seeker([
            'password' => Hash::make('secret123'),
            'status' => AccountStatus::Suspended->value,
        ]);

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertStatus(403);
    }

    public function test_an_unverified_account_cannot_sign_in(): void
    {
        $user = $this->seeker([
            'password' => Hash::make('secret123'),
            'email_verified_at' => null,
            'status' => AccountStatus::Pending->value,
        ]);

        $response = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertStatus(403);

        // No token is issued: the SPA routes on this flag to the code screen.
        $this->assertTrue($response->json('data.requires_verification'));
        $this->assertNull($response->json('data.token'));
    }

    public function test_registration_does_not_return_a_token_before_verification(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'first_name' => 'Brand',
            'last_name' => 'New',
            'email' => 'brand-new@example.com',
            'phone' => '08012345678',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertCreated();

        $this->assertTrue($response->json('data.requires_verification'));
        $this->assertNull($response->json('data.token'));
        $this->assertSame((int) config('otp.ttl_minutes'), $response->json('data.otp_expires_in_minutes'));

        $user = User::where('email', 'brand-new@example.com')->firstOrFail();

        $this->assertNull($user->email_verified_at);
        $this->assertSame(AccountStatus::Pending, $user->status);
        $this->assertSame(1, $user->otpCodes()->count());
        $this->assertNotNull($this->latestOtpCode($user->email, OtpCode::PURPOSE_VERIFY));
    }

    // --- Tokens ----------------------------------------------------------

    public function test_issued_tokens_carry_an_expiry(): void
    {
        $this->asTokenUser($this->seeker()->issueToken('auth'))->getJson('/api/v1/auth/me')->assertOk();

        $token = PersonalAccessToken::firstOrFail();

        // A token with no expiry is a permanent credential sitting in a
        // browser, a log file or a leaked backup.
        $this->assertNotNull($token->expires_at);
        $this->assertTrue($token->expires_at->isFuture());
    }

    public function test_a_token_cannot_be_replayed_after_logout(): void
    {
        $token = $this->seeker()->issueToken('auth');

        $this->asTokenUser($token)->postJson('/api/v1/auth/logout')->assertOk();

        $this->asTokenUser($token)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_logout_all_revokes_every_device(): void
    {
        $user = $this->seeker();
        $first = $user->issueToken('auth');
        $second = $user->issueToken('auth');

        $this->asTokenUser($first)->postJson('/api/v1/auth/logout-all')->assertOk();

        // This is the control a user reaches for when a device is stolen.
        $this->asTokenUser($first)->getJson('/api/v1/auth/me')->assertStatus(401);
        $this->asTokenUser($second)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    // --- One-time passwords: storage -------------------------------------

    public function test_a_code_is_stored_only_as_an_hmac(): void
    {
        $user = $this->seeker(['email_verified_at' => null]);
        $this->clearOtpLog();

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();

        $code = $this->latestOtpCode($user->email, OtpCode::PURPOSE_VERIFY);
        $record = $user->otpCodes()->firstOrFail();

        $this->assertIsString($code);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        // Only the keyed hash is persisted. A bare sha256 would be reversible in
        // seconds, because the keyspace is a million values and a database
        // dump would let an attacker hash all of them offline.
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $record->code_hash);
        $this->assertSame(app(Otp::class)->hash($code), $record->code_hash);
        $this->assertNotSame(hash('sha256', $code), $record->code_hash);

        $this->assertSame(0, $record->attempts);
        $this->assertNull($record->consumed_at);
        $this->assertTrue($record->isUsable());
    }

    public function test_a_new_code_supersedes_the_previous_one(): void
    {
        $user = $this->seeker(['email_verified_at' => null]);

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();
        $first = $this->latestOtpCode($user->email, OtpCode::PURPOSE_VERIFY);

        $this->travel((int) config('otp.resend_cooldown_seconds') + 1)->seconds();
        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();
        $second = $this->latestOtpCode($user->email, OtpCode::PURPOSE_VERIFY);

        // An attacker holding an earlier email cannot race the real owner with
        // it: the old code is gone the moment a new one is issued.
        $this->assertNotSame($first, $second);
        $this->assertSame(1, $user->otpCodes()->count());

        $this->postJson('/api/v1/auth/otp/verify', ['code' => $first, 'email' => $user->email])
            ->assertStatus(422);
    }

    public function test_a_verified_account_is_not_sent_another_code(): void
    {
        $user = $this->seeker();
        $this->clearOtpLog();

        $this->asApiUser($user)
            ->postJson('/api/v1/auth/email/verification-notification')
            ->assertOk()
            ->assertJsonPath('message', 'Email address already verified.');

        $this->assertSame(0, $user->otpCodes()->count());
        $this->assertNull($this->latestOtpCode());
    }

    public function test_a_resend_inside_the_cooldown_is_refused_server_side(): void
    {
        $user = $this->seeker(['email_verified_at' => null]);

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();

        // The browser countdown is only a courtesy; a scripted client must not
        // be able to skip past it and use this as a mail pump.
        $this->asApiUser($user)
            ->postJson('/api/v1/auth/email/verification-notification')
            ->assertStatus(429);
    }

    public function test_otp_issuing_is_rate_limited(): void
    {
        $user = $this->seeker(['email_verified_at' => null]);
        $max = (int) config('otp.rate_limit_max_attempts');

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();

        // Three per fifteen minutes per address+IP, per config/otp.php. The
        // cooldown is stepped over on every iteration so this asserts the rate
        // limit specifically, and the remaining allowance is spent first so the
        // refusal cannot be confused with the cooldown.
        for ($i = 1; $i < $max; $i++) {
            $this->travel((int) config('otp.resend_cooldown_seconds') + 1)->seconds();

            $this->asApiUser($user)
                ->postJson('/api/v1/auth/email/verification-notification')
                ->assertOk();
        }

        $this->travel((int) config('otp.resend_cooldown_seconds') + 1)->seconds();

        $this->asApiUser($user)
            ->postJson('/api/v1/auth/email/verification-notification')
            ->assertStatus(429);
    }

    // --- One-time passwords: verification --------------------------------

    public function test_a_wrong_code_does_not_verify_the_account(): void
    {
        $user = $this->seeker(['email_verified_at' => null, 'status' => AccountStatus::Pending->value]);
        $this->clearOtpLog();

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();

        $this->postJson('/api/v1/auth/otp/verify', ['code' => '000000', 'email' => $user->email])
            ->assertStatus(422);

        $this->assertNull($user->refresh()->email_verified_at);
        $this->assertSame(AccountStatus::Pending, $user->refresh()->status);
    }

    public function test_a_correct_code_verifies_activates_and_signs_in(): void
    {
        $user = $this->seeker(['email_verified_at' => null, 'status' => AccountStatus::Pending->value]);
        $this->clearOtpLog();

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();

        $code = $this->latestOtpCode($user->email, OtpCode::PURPOSE_VERIFY);

        $response = $this->postJson('/api/v1/auth/otp/verify', ['code' => $code, 'email' => $user->email])
            ->assertOk();

        $user->refresh();

        $this->assertNotNull($user->email_verified_at);
        $this->assertSame(AccountStatus::Active, $user->status);

        // A token is handed over only now, so the verification screen can go
        // straight to the dashboard.
        $this->assertNotNull($response->json('data.token'));
    }

    public function test_a_code_is_single_use(): void
    {
        $user = $this->seeker(['email_verified_at' => null, 'status' => AccountStatus::Pending->value]);
        $this->clearOtpLog();

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();
        $code = $this->latestOtpCode($user->email, OtpCode::PURPOSE_VERIFY);

        $this->postJson('/api/v1/auth/otp/verify', ['code' => $code, 'email' => $user->email])->assertOk();

        // A shoulder-surfed code in a screenshot or a mail archive must not be
        // redeemable a second time.
        $this->postJson('/api/v1/auth/otp/verify', ['code' => $code, 'email' => $user->email])
            ->assertStatus(422);
    }

    public function test_an_expired_code_is_refused(): void
    {
        $user = $this->seeker(['email_verified_at' => null]);
        $this->clearOtpLog();

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();
        $code = $this->latestOtpCode($user->email, OtpCode::PURPOSE_VERIFY);

        $this->travel((int) config('otp.ttl_minutes') + 1)->minutes();

        $this->postJson('/api/v1/auth/otp/verify', ['code' => $code, 'email' => $user->email])
            ->assertStatus(422);

        $this->assertNull($user->refresh()->email_verified_at);
    }

    public function test_repeated_wrong_codes_burn_the_code(): void
    {
        $user = $this->seeker(['email_verified_at' => null]);
        $this->clearOtpLog();

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();
        $code = $this->latestOtpCode($user->email, OtpCode::PURPOSE_VERIFY);

        // Six digits is a million combinations, so without an attempt cap the
        // ten minute window would be brute-forceable by script.
        for ($i = 0; $i < (int) config('otp.max_code_attempts'); $i++) {
            $this->postJson('/api/v1/auth/otp/verify', ['code' => '111111', 'email' => $user->email])
                ->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/otp/verify', ['code' => $code, 'email' => $user->email])
            ->assertStatus(422);

        $this->assertNull($user->refresh()->email_verified_at);
        $this->assertNotNull($user->otpCodes()->firstOrFail()->consumed_at);
    }

    public function test_code_guessing_is_rate_limited(): void
    {
        $limited = null;

        for ($i = 0; $i < 20; $i++) {
            $response = $this->postJson('/api/v1/auth/otp/verify', [
                'code' => '222222',
                'email' => 'guesser@example.com',
            ]);

            if ($response->status() === 429) {
                $limited = $response;
                break;
            }
        }

        $this->assertNotNull($limited, 'The verify endpoint must reject sustained guessing.');
        $limited->assertHeader('Retry-After');
    }

    public function test_an_unknown_address_gets_the_same_answer_as_a_wrong_code(): void
    {
        $known = $this->postJson('/api/v1/auth/otp/verify', [
            'code' => '333333',
            'email' => 'nobody@example.com',
        ])->assertStatus(422);

        // No code exists for this address at all. If that read differently from
        // a wrong code, the endpoint would enumerate registered addresses.
        $this->assertSame('That code is not valid. Check it and try again.', $known->json('message'));
    }

    public function test_a_code_issued_to_one_account_cannot_be_redeemed_by_another(): void
    {
        $owner = $this->seeker(['email_verified_at' => null]);
        $intruder = $this->seeker();
        $this->clearOtpLog();

        $this->asApiUser($owner)->postJson('/api/v1/auth/email/verification-notification')->assertOk();
        $code = $this->latestOtpCode($owner->email, OtpCode::PURPOSE_VERIFY);

        // Signing in as somebody else and submitting their address must fail:
        // the code is scoped to the session that requested it.
        $this->asApiUser($intruder)
            ->postJson('/api/v1/auth/otp/verify', ['code' => $code, 'email' => $owner->email])
            ->assertStatus(422);

        $this->assertNull($owner->refresh()->email_verified_at);
    }

    public function test_a_verification_code_cannot_be_used_to_reset_a_password(): void
    {
        $user = $this->seeker(['email_verified_at' => null]);
        $this->clearOtpLog();

        $this->asApiUser($user)->postJson('/api/v1/auth/email/verification-notification')->assertOk();
        $code = $this->latestOtpCode($user->email, OtpCode::PURPOSE_VERIFY);

        // Otherwise proving you own an address during signup would be enough to
        // take over an account later.
        $this->postJson('/api/v1/auth/otp/verify', [
            'code' => $code,
            'email' => $user->email,
            'purpose' => OtpCode::PURPOSE_RESET,
        ])->assertStatus(422);
    }

    // --- One-time passwords: delivery -------------------------------------

    public function test_password_reset_code_is_sent_through_the_brevo_api(): void
    {
        Mail::fake();
        Http::preventStrayRequests();
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response(['messageId' => 'fake-message-id'], 201),
        ]);

        $apiKey = Str::random(48);
        config([
            'mail.enabled' => true,
            'queue.default' => 'database',
            'services.brevo.api_key' => $apiKey,
        ]);

        User::factory()->create(['email' => 'real@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'real@example.com'])->assertOk();

        Http::assertSent(function (ClientRequest $request) use ($apiKey): bool {
            $payload = $request->data();

            return $request->url() === 'https://api.brevo.com/v3/smtp/email'
                && $request->hasHeader('api-key', $apiKey)
                && ($payload['sender']['email'] ?? null) === config('mail.from.address')
                && ($payload['sender']['name'] ?? null) === config('mail.from.name')
                && ($payload['to'][0]['email'] ?? null) === 'real@example.com'
                && str_contains($payload['subject'] ?? '', 'password reset code')
                && str_contains($payload['htmlContent'] ?? '', 'Reset your password')
                && str_contains($payload['textContent'] ?? '', 'Reset your password');
        });

        Mail::assertNothingSent();

        $events = collect($this->otpStatusLog()->getRecords())
            ->map(fn ($record) => $record->context['event'] ?? null)
            ->all();
        $this->assertContains('otp.generated', $events);
        $this->assertContains('otp.mail.accepted', $events);
        $this->assertSame('brevo_api', collect($this->otpStatusLog()->getRecords())
            ->first(fn ($record) => ($record->context['event'] ?? null) === 'otp.mail.accepted')
            ->context['transport']);
    }

    public function test_a_code_is_never_written_to_the_log_once_mail_works(): void
    {
        Mail::fake();
        Http::preventStrayRequests();
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response(['messageId' => 'fake-message-id'], 201),
        ]);
        config([
            'mail.enabled' => true,
            'services.brevo.api_key' => Str::random(48),
        ]);
        $this->clearOtpLog();

        User::factory()->create(['email' => 'real@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'real@example.com'])->assertOk();

        // The plaintext exists exactly once, on its way to the mailer. Once
        // delivery works there is no second copy in a log on the disk.
        $this->assertNull($this->latestOtpCode());
    }

    public function test_a_gateway_that_rejects_the_send_does_not_break_registration(): void
    {
        $this->useFailingBrevoApi();

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

        // 503, not 429 and certainly not a 500: nobody is being throttled, the
        // provider is refusing the send. 429 here would tell the client to slow
        // down, which would make it worse.
        $response->assertStatus(503)
            ->assertJsonPath('success', false);

        // A signup that cannot be completed must not persist, or the address is
        // now taken by an account nobody can ever activate.
        $this->assertDatabaseMissing('users', ['email' => 'ada@example.com']);
    }

    public function test_a_gateway_that_rejects_the_send_does_not_break_login(): void
    {
        $user = $this->seeker([
            'email' => 'pending@example.com',
            'password' => 'secret123',
            'email_verified_at' => null,
            'status' => AccountStatus::Pending,
        ]);

        $this->useFailingBrevoApi();

        // Correct password, unverified address, dead gateway. The answer is the
        // same 403 the flow gives in every other case — the exception must not
        // escape and turn a working password into a 500.
        $this->postJson('/api/v1/auth/login', [
            'email' => 'pending@example.com',
            'password' => 'secret123',
        ])->assertStatus(403)
            ->assertJsonPath('data.requires_verification', true);

        $this->assertNotNull($user->fresh());
    }

    public function test_a_code_the_gateway_refused_is_not_left_behind(): void
    {
        $user = $this->seeker([
            'email' => 'pending@example.com',
            'password' => 'secret123',
            'email_verified_at' => null,
            'status' => AccountStatus::Pending,
        ]);

        $this->useFailingBrevoApi();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'pending@example.com',
            'password' => 'secret123',
        ])->assertStatus(403);

        // A row for a code that never left the server is worse than no row at
        // all: it starts the resend cooldown, so the one action that could fix
        // the outage — asking again — is the action the cooldown blocks.
        $this->assertDatabaseMissing('otp_codes', ['email' => 'pending@example.com']);

        // And the reason is written down, or an outage is invisible.
        $this->assertTrue(
            (bool) collect($this->otpLogMessages())->first(
                fn (string $line): bool => str_contains($line, 'OTP mail delivery failed')
            ),
            'A refused send should be recorded on the otp-codes channel.'
        );
    }

    public function test_password_reset_keeps_its_neutral_response_and_logs_redacted_mail_failures(): void
    {
        $recipient = 'reset-mail@example.com';
        $apiKey = Str::random(48);
        $oneTimeCode = (string) random_int(100000, 999999);
        $failure = "Invalid API key {$apiKey} for {$recipient}; code={$oneTimeCode}";

        Http::preventStrayRequests();
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response([
                'code' => 'unauthorized',
                'message' => $failure,
            ], 401),
        ]);

        User::factory()->create(['email' => $recipient, 'password' => 'secret123']);
        config([
            'mail.enabled' => true,
            'services.brevo.api_key' => $apiKey,
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', ['email' => $recipient])->assertOk();

        $this->assertSame(
            'If that email is registered, a verification code has been sent.',
            $response->json('message')
        );

        $records = $this->otpStatusLog()->getRecords();
        $events = collect($records)->map(fn ($record) => $record->context['event'] ?? null)->all();
        $this->assertContains('otp.generated', $events);
        $this->assertContains('otp.mail.failed', $events);
        $this->assertContains('password_reset.otp.not_completed', $events);

        $failureRecord = collect($records)->first(
            fn ($record) => ($record->context['event'] ?? null) === 'otp.mail.failed'
        );

        $this->assertSame(UnexpectedValueException::class, $failureRecord->context['failure_type']);
        $safeMessage = $failureRecord->context['failure_message'];
        $this->assertStringContainsString('Brevo API returned HTTP 401', $safeMessage);
        $this->assertStringNotContainsString($recipient, $safeMessage);
        $this->assertStringNotContainsString($apiKey, $safeMessage);
        $this->assertStringNotContainsString($oneTimeCode, $safeMessage);
        $this->assertDatabaseMissing('otp_codes', ['email' => $recipient]);
    }

    public function test_email_verification_code_is_sent_through_the_brevo_api(): void
    {
        Mail::fake();
        Http::preventStrayRequests();
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response(['messageId' => 'fake-message-id'], 201),
        ]);
        $apiKey = Str::random(48);
        config([
            'mail.enabled' => true,
            'queue.default' => 'database',
            'services.brevo.api_key' => $apiKey,
        ]);

        $user = $this->seeker([
            'email' => 'verify@example.com',
            'email_verified_at' => null,
            'status' => AccountStatus::Pending,
        ]);

        $this->asApiUser($user)
            ->postJson('/api/v1/auth/email/verification-notification')
            ->assertOk();

        // The signup code rides the same API as a password-reset code, so a
        // broken SMTP mailer can never take registration down with it.
        Http::assertSent(function (ClientRequest $request) use ($apiKey): bool {
            $payload = $request->data();

            return $request->url() === 'https://api.brevo.com/v3/smtp/email'
                && $request->hasHeader('api-key', $apiKey)
                && ($payload['to'][0]['email'] ?? null) === 'verify@example.com'
                && str_contains($payload['subject'] ?? '', 'verify your email address')
                && str_contains($payload['htmlContent'] ?? '', 'Verify your email address');
        });

        Mail::assertNothingSent();
    }

    public function test_a_refused_send_answers_the_resend_with_503_not_a_throttle(): void
    {
        $user = $this->seeker([
            'email' => 'pending@example.com',
            'password' => 'secret123',
            'email_verified_at' => null,
            'status' => AccountStatus::Pending,
        ]);

        $this->useFailingBrevoApi();
        $this->asApiUser($user);

        $response = $this->postJson('/api/v1/auth/email/verification-notification');

        // Authenticated, so naming the outage is safe here — and a 429 carrying
        // Retry-After: 0 would instruct the client to hammer a broken provider.
        // The unauthenticated resend deliberately still answers 200, because
        // there a difference in the reply would confirm the address exists.
        $response->assertStatus(503)
            ->assertJsonPath('success', false);
    }

    /**
     * Point OTP delivery at a provider that refuses every message, which is
     * what an unverified sender domain, a revoked API key or a provider outage
     * looks like from inside the app. One-time passwords go over the Brevo
     * HTTP API, so the refusal arrives as an HTTP error body rather than an
     * SMTP reply.
     */
    private function useFailingBrevoApi(string $failureMessage = 'The example.com domain is not verified.'): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response([
                'code' => 'invalid_parameter',
                'message' => $failureMessage,
            ], 400),
        ]);

        config([
            'mail.enabled' => true,
            'services.brevo.api_key' => Str::random(48),
        ]);
    }

    public function test_password_reset_does_not_reveal_whether_an_account_exists(): void
    {
        User::factory()->create(['email' => 'known@example.com', 'password' => 'secret123']);
        $this->clearOtpLog();

        $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.com'])->assertOk();
        $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'ghost@example.com'])->assertOk();

        $this->assertSame($known->json(), $unknown->json());
        $this->assertTrue($this->otpLogMentions('known@example.com'));
        $this->assertFalse($this->otpLogMentions('ghost@example.com'));
    }

    // --- One-time passwords: password recovery ---------------------------

    public function test_a_password_can_be_reset_and_the_new_one_works(): void
    {
        $user = User::factory()->create(['email' => 'reset@example.com', 'password' => 'secret123']);

        $grant = $this->beginPasswordReset('reset@example.com');

        $this->postJson('/api/v1/auth/reset-password', [
            'grant' => $grant,
            'email' => 'reset@example.com',
            'password' => 'brand-new-secret',
            'password_confirmation' => 'brand-new-secret',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-secret', $user->refresh()->password));

        $this->postJson('/api/v1/auth/login', ['email' => 'reset@example.com', 'password' => 'brand-new-secret'])
            ->assertOk();
    }

    public function test_a_reset_grant_is_single_use(): void
    {
        User::factory()->create(['email' => 'once@example.com', 'password' => 'secret123']);

        $payload = [
            'grant' => $this->beginPasswordReset('once@example.com'),
            'email' => 'once@example.com',
            'password' => 'brand-new-secret',
            'password_confirmation' => 'brand-new-secret',
        ];

        $this->postJson('/api/v1/auth/reset-password', $payload)->assertOk();

        // The same grant must not buy a second password change.
        $this->postJson('/api/v1/auth/reset-password', $payload)->assertStatus(422);
    }

    public function test_resetting_a_password_revokes_every_existing_token(): void
    {
        $user = User::factory()->create(['email' => 'stolen@example.com', 'password' => 'secret123']);
        $user->createToken('auth');

        $grant = $this->beginPasswordReset('stolen@example.com');

        $this->postJson('/api/v1/auth/reset-password', [
            'grant' => $grant,
            'email' => 'stolen@example.com',
            'password' => 'brand-new-secret',
            'password_confirmation' => 'brand-new-secret',
        ])->assertOk();

        // A session captured before the change must not outlive it.
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_a_recovery_also_activates_a_pending_account(): void
    {
        // A signup whose code never arrived is otherwise stranded with an
        // account it can never use.
        $user = User::factory()->create([
            'email' => 'pending@example.com',
            'password' => 'secret123',
            'email_verified_at' => null,
            'status' => AccountStatus::Pending->value,
        ]);

        $grant = $this->beginPasswordReset('pending@example.com');

        $this->postJson('/api/v1/auth/reset-password', [
            'grant' => $grant,
            'email' => 'pending@example.com',
            'password' => 'brand-new-secret',
            'password_confirmation' => 'brand-new-secret',
        ])->assertOk();

        $user->refresh();

        $this->assertNotNull($user->email_verified_at);
        $this->assertSame(AccountStatus::Active, $user->status);
    }

    public function test_reset_password_rejects_a_weak_password(): void
    {
        User::factory()->create(['email' => 'weak@example.com', 'password' => 'secret123']);

        $grant = $this->beginPasswordReset('weak@example.com');

        $this->postJson('/api/v1/auth/reset-password', [
            'grant' => $grant,
            'email' => 'weak@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertStatus(422);
    }

    public function test_reset_password_rejects_a_forged_grant(): void
    {
        User::factory()->create(['email' => 'forged@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/auth/reset-password', [
            'grant' => Str::random(64),
            'email' => 'forged@example.com',
            'password' => 'brand-new-secret',
            'password_confirmation' => 'brand-new-secret',
        ])->assertStatus(422);
    }

    public function test_a_grant_only_works_for_its_own_address(): void
    {
        User::factory()->create(['email' => 'mine@example.com', 'password' => 'secret123']);
        $victim = User::factory()->create(['email' => 'theirs@example.com', 'password' => 'secret123']);

        $grant = $this->beginPasswordReset('mine@example.com');

        // Replaying a genuine grant against a different account must not work.
        $this->postJson('/api/v1/auth/reset-password', [
            'grant' => $grant,
            'email' => 'theirs@example.com',
            'password' => 'brand-new-secret',
            'password_confirmation' => 'brand-new-secret',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('secret123', $victim->refresh()->password));
    }

    public function test_an_admin_can_recover_their_own_account(): void
    {
        // Self-service recovery is available to every role, not just seekers.
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'secret123',
            'role' => UserRole::Admin->value,
            'status' => AccountStatus::Active->value,
        ]);

        $grant = $this->beginPasswordReset('admin@example.com');

        $this->postJson('/api/v1/auth/reset-password', [
            'grant' => $grant,
            'email' => 'admin@example.com',
            'password' => 'brand-new-secret',
            'password_confirmation' => 'brand-new-secret',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-secret', $admin->refresh()->password));
    }

    /**
     * Run the first half of a recovery and hand back the single-use grant.
     */
    private function beginPasswordReset(string $email): string
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $email])->assertOk();

        $code = $this->latestOtpCode($email, OtpCode::PURPOSE_RESET);

        $this->assertIsString($code, "No reset code was issued for {$email}.");

        $grant = $this->postJson('/api/v1/auth/otp/verify', [
            'code' => $code,
            'email' => $email,
            'purpose' => OtpCode::PURPOSE_RESET,
        ])->assertOk()->json('data.grant');

        $this->assertIsString($grant);

        return $grant;
    }

    // --- Uploads ----------------------------------------------------------

    public function test_html_content_named_as_a_pdf_is_rejected(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();

        // The extension and the client-declared type both claim PDF. Only the
        // bytes give it away, and the bytes are what the guard inspects.
        $this->asApiUser($seeker)->post('/api/v1/seeker/cv', [
            'cv' => UploadedFile::fake()->createWithContent(
                'resume.pdf',
                '<!doctype html><html><body><script>alert(document.cookie)</script></body></html>',
            ),
        ])->assertStatus(422);

        $this->assertNull($seeker->refresh()->profile->cv_path);
    }

    public function test_a_pdf_upload_is_stored_outside_the_web_root(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->post('/api/v1/seeker/cv', [
            'cv' => UploadedFile::fake()->createWithContent('resume.pdf', self::PDF_BYTES),
        ])->assertCreated();

        $path = $seeker->refresh()->profile->cv_path;

        $this->assertNotNull($path);
        Storage::disk('local')->assertExists($path);

        // The stored name is fully random, so nothing user-controlled can ever
        // become a path or an executable name on disk.
        $this->assertStringNotContainsString('resume', $path);
    }

    public function test_cv_download_is_forced_as_an_attachment(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->post('/api/v1/seeker/cv', [
            'cv' => UploadedFile::fake()->createWithContent('resume.pdf', self::PDF_BYTES),
        ])->assertCreated();

        $response = $this->asApiUser($seeker)->get('/api/v1/seeker/cv/download')->assertOk();

        // Served as an octet-stream attachment with nosniff, so a hostile
        // document can never be rendered inline on the API's own origin.
        $this->assertSame('application/octet-stream', $response->headers->get('Content-Type'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertStringContainsString('attachment', (string) $response->headers->get('Content-Disposition'));
    }

    public function test_a_traversal_filename_is_stripped_from_the_stored_label(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->post('/api/v1/seeker/cv', [
            'cv' => UploadedFile::fake()->createWithContent('../../../../evil.pdf', self::PDF_BYTES),
        ])->assertCreated();

        $profile = $seeker->refresh()->profile;

        // The label is only ever rendered in the UI and echoed back in a
        // Content-Disposition header, so a quote or a traversal must not
        // survive into either.
        $this->assertSame('evil.pdf', $profile->cv_name);
        $this->assertStringNotContainsString('..', (string) $profile->cv_name);
    }

    public function test_uploading_a_second_cv_replaces_the_first(): void
    {
        Storage::fake('local');
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->post('/api/v1/seeker/cv', [
            'cv' => UploadedFile::fake()->createWithContent('first.pdf', self::PDF_BYTES),
        ])->assertCreated();

        $first = $seeker->refresh()->profile->cv_path;

        $this->asApiUser($seeker)->post('/api/v1/seeker/cv', [
            'cv' => UploadedFile::fake()->createWithContent('second.pdf', self::PDF_BYTES),
        ])->assertCreated();

        // The superseded file is deleted, so a replaced CV cannot still be
        // downloaded by guessing the old random name.
        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($seeker->refresh()->profile->cv_path);
    }
}
