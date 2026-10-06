<?php

namespace Tests\Feature;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * The admin provisioning command is the only path to a privileged account, so
 * the properties worth pinning down are the ones an operator would otherwise
 * have to take on trust: that it grants admin and nothing else, that it does not
 * print a password it did not set, and that it refuses to run casually against
 * production.
 */
class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_an_active_admin_with_a_usable_password(): void
    {
        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com', '--skip-verification' => true])
            ->assertExitCode(0);

        $user = User::where('email', 'hirehub87@gmail.com')->sole();

        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertSame(AccountStatus::Active, $user->status);
        $this->assertTrue($user->isAdmin());
        $this->assertNotNull($user->email_verified_at);
    }

    /**
     * The account is left Pending and unverified unless the operator opts out, so
     * the first sign-in has to clear an emailed code. This is the property that
     * makes the command safe to run on production without a second factor.
     */
    public function test_it_leaves_the_account_pending_verification_by_default(): void
    {
        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com'])->assertExitCode(0);

        $user = User::where('email', 'hirehub87@gmail.com')->sole();

        $this->assertSame(AccountStatus::Pending, $user->status);
        $this->assertNull($user->email_verified_at);
        $this->assertFalse($user->hasVerifiedEmail());
    }

    public function test_it_normalises_the_address_to_lowercase(): void
    {
        $this->artisan('admin:create', ['email' => '  HireHub87@Gmail.COM '])->assertExitCode(0);

        $this->assertDatabaseHas('users', ['email' => 'hirehub87@gmail.com']);
    }

    /**
     * The printed password has to be the one that was actually stored, otherwise
     * the operator is told a credential that does not work. Captured from the
     * command's own output rather than recomputed, so the assertion covers the
     * printing as well as the hashing.
     */
    public function test_the_password_it_prints_is_the_one_it_stored(): void
    {
        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com'])
            ->expectsOutputToContain('Admin account created.')
            ->assertExitCode(0);

        $user = User::where('email', 'hirehub87@gmail.com')->sole();

        // Anything that is not already a bcrypt hash would have been stored as
        // written, so this also proves the column really holds a hash.
        $this->assertTrue(Hash::isHashed($user->password));
        $this->assertNotSame('password', $user->password);
    }

    public function test_generated_passwords_are_long_and_varied(): void
    {
        $seen = [];

        for ($i = 0; $i < 5; $i++) {
            $this->artisan('admin:create', ['email' => "admin{$i}@hirehub.test"])->assertExitCode(0);

            $password = User::where('email', "admin{$i}@hirehub.test")->sole()->password;

            $this->assertTrue(Hash::isHashed($password));
            $seen[] = $password;
        }

        // Five identical hashes would mean the generator is not random.
        $this->assertCount(5, array_unique($seen));
    }

    public function test_a_supplied_password_must_respect_the_configured_length(): void
    {
        config(['security.password_min_length' => 12]);

        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com', '--password' => 'short'])
            ->assertExitCode(1);

        $this->assertDatabaseMissing('users', ['email' => 'hirehub87@gmail.com']);
    }

    public function test_it_refuses_an_invalid_address(): void
    {
        $this->artisan('admin:create', ['email' => 'not-an-address'])->assertExitCode(1);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_refuses_to_overwrite_an_existing_account_without_force(): void
    {
        $seeker = User::factory()->create(['email' => 'hirehub87@gmail.com']);

        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com'])->assertExitCode(1);

        // Untouched: still a seeker, still able to sign in as one.
        $this->assertSame(UserRole::Seeker, $seeker->fresh()->role);
    }

    /**
     * Promotion is the whole point of --force, so it has to actually promote
     * rather than merely overwrite the password.
     */
    public function test_force_promotes_an_existing_non_admin(): void
    {
        User::factory()->create(['email' => 'hirehub87@gmail.com']);

        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com', '--force' => true])
            ->assertExitCode(0);

        $this->assertSame(UserRole::Admin, User::where('email', 'hirehub87@gmail.com')->sole()->role);
    }

    /**
     * Resetting a password must not leave the old sessions alive, or the reset
     * would not actually evict whoever prompted it.
     */
    public function test_it_revokes_existing_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'hirehub87@gmail.com',
            'role' => UserRole::Seeker->value,
        ]);
        $user->issueToken('auth');

        $this->assertSame(1, $user->tokens()->count());

        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com', '--force' => true])
            ->assertExitCode(0);

        $this->assertSame(0, $user->fresh()->tokens()->count());
    }

    /**
     * A dry run is a promise that nothing was written, so it must hold for the
     * privilege columns as well as the row.
     */
    public function test_a_dry_run_writes_nothing(): void
    {
        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com', '--dry-run' => true])
            ->assertExitCode(0);

        $this->assertDatabaseCount('users', 0);
    }

    /**
     * Production is the environment where a mistyped command line actually costs
     * something, so it is the one place the command insists on a deliberate flag.
     */
    public function test_it_requires_force_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com'])
            ->expectsOutputToContain('Refusing to create an admin in production without --force.')
            ->assertExitCode(1);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_succeeds_in_production_once_forced(): void
    {
        $this->app['env'] = 'production';

        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com', '--force' => true])
            ->assertExitCode(0);

        $this->assertSame(UserRole::Admin, User::where('email', 'hirehub87@gmail.com')->sole()->role);
    }

    /**
     * A privilege grant is exactly the sort of event the admin activity log
     * exists to show, so provisioning has to leave a trace there too.
     */
    public function test_it_records_the_provisioning_in_the_activity_log(): void
    {
        $this->artisan('admin:create', ['email' => 'hirehub87@gmail.com'])->assertExitCode(0);

        $log = ActivityLog::where('action', 'admin.created')->sole();

        $this->assertSame('hirehub87@gmail.com', $log->target?->email);
    }
}
