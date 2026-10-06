<?php

namespace App\Console\Commands;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\User;
use App\Support\TemporaryPassword;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Creates an admin account from the command line.
 *
 * An admin is the one account type that cannot be minted through the product:
 * `POST /auth/register` allowlists `seeker` and `employer` and rejects anything
 * else, precisely so that publishing a signup form can never publish a way to
 * register an admin. That leaves the shell as the only provisioning path, which
 * is the right trade for a platform this small — the operator is the only person
 * who should ever be able to grant platform-wide privilege, and they should have
 * to mean it.
 *
 * Two deliberate properties of the account it writes:
 *
 *  - The password is generated here and printed once. Nothing is written to the
 *    repository, the seeders or the log, so there is no published credential to
 *    find later. A password supplied with `--password=` is accepted for
 *    automation, but it is refused in production unless the operator has
 *    confirmed the command with `--force`, because it lands in the shell
 *    history.
 *  - The account is left Pending and unverified by default. The first sign-in
 *    therefore has to clear the same emailed one-time password as any other
 *    account, which is what proves the operator controls the inbox they are
 *    claiming. `--skip-verification` exists for the case where transactional
 *    mail is broken and the console is the only way back in.
 */
class CreateAdminCommand extends Command
{
    protected $signature = 'admin:create
                            {email : Email address for the admin account}
                            {--name= : Display name, defaults to the email local part}
                            {--password= : Use this password instead of the generated one}
                            {--skip-verification : Create the account already active and verified, so no code is emailed}
                            {--force : Confirm the command in production, and allow overwriting an existing account}
                            {--dry-run : Report what would happen without writing}';

    protected $description = 'Create an admin account with a generated temporary password';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('That is not a valid email address.');

            return self::FAILURE;
        }

        $existing = User::where('email', $email)->first();
        $forced = (bool) $this->option('force');

        // Production is the only environment where a stray command line is a
        // real risk: granting platform-wide privilege is not something that
        // should happen because someone tab-completed a command in the wrong
        // shell on the production box.
        if (app()->environment('production') && ! $forced) {
            $this->error('Refusing to create an admin in production without --force.');
            $this->line('  Re-run with --force once you are sure of the address.');
            $this->line("  <fg=gray>php artisan admin:create {$email} --force</>");

            return self::FAILURE;
        }

        if ($existing && ! $forced) {
            $this->error("An account already exists for {$email}.");
            $this->line('  Re-run with --force to reset its password and grant the admin role.');

            return self::FAILURE;
        }

        if ($existing && $existing->isAdmin()) {
            $this->warn("{$email} is already an admin. --force will reset the password and revoke every active session.");
        }

        $password = $this->resolvePassword();

        if ($password === null) {
            return self::FAILURE;
        }

        $skipVerification = (bool) $this->option('skip-verification');
        $name = $this->resolveName($email);

        $this->newLine();
        $this->line("  Email                {$email}");
        $this->line("  Name                 {$name}");
        $this->line('  Role                 '.UserRole::Admin->label());
        $this->line('  Status               '.($skipVerification ? AccountStatus::Active->label() : AccountStatus::Pending->label()));
        $this->line('  Email verified       '.($skipVerification ? 'yes' : 'no, first sign-in will ask for a code'));
        $this->newLine();

        if ($this->option('dry-run')) {
            $this->info('Dry run — nothing was written.');

            return self::SUCCESS;
        }

        $user = $existing ?: new User;
        $user->fill(['name' => $name, 'email' => $email, 'password' => Hash::make($password)]);

        // Privilege columns are assigned explicitly rather than filled from
        // input, the same rule the registration path follows.
        $user->forceFill([
            'role' => UserRole::Admin,
            'status' => $skipVerification ? AccountStatus::Active : AccountStatus::Pending,
            'email_verified_at' => $skipVerification ? now() : null,
        ])->save();

        // A password change elsewhere in the app invalidates every outstanding
        // token, so provisioning must too — otherwise resetting a compromised
        // account would leave its sessions alive.
        $user->revokeTokens();

        ActivityLog::record($user, 'admin.created', $user, 'warning');

        $this->newLine();
        $this->line($existing
            ? '  <fg=green>Existing account promoted and password reset.</>'
            : '  <fg=green>Admin account created.</>');
        $this->newLine();

        // Printed unconditionally, because a fresh password is written on every
        // run — including the --force overwrite, where the previous credential
        // has just been invalidated. Hiding it there would lock the operator out
        // of the account they are provisioning.
        $this->line($existing
            ? '  New password (shown once, never stored in plaintext):'
            : '  Temporary password (shown once, never stored in plaintext):');
        $this->newLine();
        $this->line("    {$password}");
        $this->newLine();
        $this->line('  <fg=yellow>Change it immediately after signing in.</>');

        if ($skipVerification) {
            $this->line('  The account is already active, so sign-in will not ask for a code.');
        } else {
            $this->line("  Sign in at /login with the password above, then enter the code mailed to {$email}.");
        }

        $this->newLine();

        return self::SUCCESS;
    }

    /**
     * The operator's password, or a generated one.
     *
     * `--password=` is the odd one out: it is the only way to end up with a
     * known-in-advance credential, so it is treated as the dangerous option it
     * is rather than being quietly accepted.
     *
     * Returns null when a supplied password is unusable, having already said
     * why. It deliberately does not exit the process: this command is also run
     * from tests and from anything else that embeds Artisan, where terminating
     * PHP outright would take the caller down with it.
     */
    private function resolvePassword(): ?string
    {
        $supplied = $this->option('password');

        if (is_string($supplied) && $supplied !== '') {
            $min = (int) config('security.password_min_length');
            $max = (int) config('security.password_max_length');

            try {
                TemporaryPassword::assertStorable($supplied, $min);
            } catch (RuntimeException $e) {
                $this->error($e->getMessage()." (configured maximum: {$max}).");

                return null;
            }

            $this->warn('Using the password you supplied — it is now in this shell\'s history.');

            return $supplied;
        }

        return TemporaryPassword::generate();
    }

    private function resolveName(string $email): string
    {
        $name = trim((string) $this->option('name'));

        if ($name !== '') {
            return Str::limit($name, 255, '');
        }

        return Str::headline(Str::before($email, '@'));
    }
}
