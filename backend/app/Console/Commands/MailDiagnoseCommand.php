<?php

namespace App\Console\Commands;

use App\Support\Otp;
use Illuminate\Console\Command;
use Throwable;

/**
 * Proves that transactional mail is actually configured, and optionally
 * delivers a real message.
 *
 * The requirement for this project is that one-time passwords reach a real
 * inbox rather than the log file. That is easy to believe and hard to confirm
 * by reading .env, so this command reports each setting, explains what is
 * missing, and can send a genuine OTP email through the same path a real code
 * takes — the Brevo API, not the configured mailer.
 */
class MailDiagnoseCommand extends Command
{
    protected $signature = 'mail:diagnose
        {--to= : Send a real test email to this address}
        {--code=123456 : Code to embed in the test email}
        {--purpose=verify : Purpose of OTP (verify or reset)}';

    protected $description = 'Report the mail configuration and optionally deliver a real test one-time password';

    public function handle(): int
    {
        $this->newLine();
        $this->line('  HireHub mail diagnostics');
        $this->newLine();

        $enabled = (bool) config('mail.enabled');
        $mailer = (string) config('mail.default');
        $transport = (string) (config("mail.mailers.{$mailer}.transport") ?? 'unknown');

        $rows = [
            ['MAIL_ENABLED', $enabled ? 'true' : 'false', $enabled],
            ['MAIL_MAILER', $mailer, true],
            ['transport', $transport, true],
            ['MAIL_HOST', (string) config("mail.mailers.{$mailer}.host"), (bool) config("mail.mailers.{$mailer}.host")],
            ['MAIL_PORT', (string) config("mail.mailers.{$mailer}.port"), (bool) config("mail.mailers.{$mailer}.port")],
            ['encryption', (string) (config("mail.mailers.{$mailer}.encryption") ?: config("mail.mailers.{$mailer}.scheme") ?: 'auto'), true],
            ['username', (string) config("mail.mailers.{$mailer}.username"), (bool) config("mail.mailers.{$mailer}.username")],
            ['from address', (string) config('mail.from.address'), (bool) config('mail.from.address')],
            ['from name', (string) config('mail.from.name'), true],
            ['assets url', (string) config('mail.from_assets_url'), true],
            ['queue', (string) config('queue.default'), true],
        ];

        foreach ($rows as [$label, $value, $ok]) {
            $this->line(sprintf(
                '  %s %-14s %s',
                $ok ? '<fg=green>OK  </>' : '<fg=red>MISS</>',
                $label,
                $value
            ));
        }

        $this->newLine();

        $problems = $this->problems($enabled, $mailer, $transport);

        if ($problems) {
            foreach ($problems as $problem) {
                $this->line("  <fg=yellow>!</> {$problem}");
            }
            $this->newLine();
        }

        $recipient = (string) $this->option('to');

        if ($recipient === '') {
            $this->line('  Pass <info>--to=you@example.com</info> to deliver a real test email.');
            $this->newLine();

            return $problems ? self::FAILURE : self::SUCCESS;
        }

        $purpose = (string) $this->option('purpose') ?: 'verify';

        return $this->sendTest($recipient, (string) $this->option('code'), $purpose, $problems);
    }

    /**
     * @param  array<int, string>  $problems
     */
    private function sendTest(string $recipient, string $code, string $purpose, array $problems): int
    {
        $this->line("  Sending a real test [{$purpose}] email to <info>{$recipient}</info> …");
        $this->newLine();

        // Otp::deliver() with mail disabled writes the code to the log and
        // returns without raising, so without this guard the command would
        // claim a delivery that never happened.
        if (! config('mail.enabled')) {
            $this->line('  <fg=red>FAILED</> MAIL_ENABLED is false — the code would only be written to the log.');
            $this->newLine();

            return self::FAILURE;
        }

        try {
            (new Otp)->deliver($code, $recipient, $purpose, 'Diagnostics');
        } catch (Throwable $e) {
            $this->line("  <fg=red>FAILED</> {$e->getMessage()}");
            $this->newLine();

            return self::FAILURE;
        }

        $this->line('  <fg=green>Sent.</> Check the inbox (and spam) for the code.');
        $this->newLine();

        if ($problems) {
            $this->line('  <fg=yellow>!</> The send worked, but the configuration above is still incomplete.');
            $this->newLine();

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * @return array<int, string>
     */
    private function problems(bool $enabled, string $mailer, string $transport): array
    {
        $problems = [];

        if (! $enabled) {
            $problems[] = 'MAIL_ENABLED is false — one-time passwords are only written to the log, never sent. Set MAIL_ENABLED=true.';
        }

        if ($transport === 'log') {
            $problems[] = "MAIL_MAILER is 'log' — nothing leaves this machine. Point it at smtp, mailgun, ses or resend.";
        }

        if ($transport === 'array') {
            $problems[] = "MAIL_MAILER is 'array' — messages are captured in memory and discarded. This is the test-suite setting only.";
        }

        if ($transport === 'smtp') {
            if (! config('mail.mailers.smtp.url') && ! config('mail.mailers.smtp.host')) {
                $problems[] = 'The smtp mailer has neither MAIL_URL nor MAIL_HOST set.';
            }

            // A null username against a non-local host is the classic
            // misconfiguration: the handshake reaches the provider and is then
            // rejected with a 535 that reads like a network fault.
            $host = (string) (config('mail.mailers.smtp.host') ?? '');
            $isLocal = in_array($host, ['127.0.0.1', 'localhost', '::1', ''], true);

            if (! $isLocal && ! config('mail.mailers.smtp.username')) {
                $problems[] = 'MAIL_USERNAME is empty for a remote SMTP host — most providers will reject the login.';
            }
        }

        if ($transport === 'mailgun' && ! config('mail.mailers.mailgun.secret')) {
            $problems[] = 'MAIL_MAILGUN_SECRET is not set.';
        }

        // One-time passwords never touch the configured mailer: Otp::deliver()
        // sends every code over the Brevo HTTP API and authenticates with
        // BREVO_API_KEY, so a healthy SMTP setup says nothing about whether
        // codes arrive — and without this key no code can be sent at all, no
        // matter how healthy the mailer looks.
        if ($enabled && ! config('services.brevo.api_key')) {
            $problems[] = 'BREVO_API_KEY is not set. One-time password emails are delivered through the Brevo API rather than the configured mailer, so no code can be sent even though this mailer is healthy.';
        }

        if ($mailer === 'failover' && in_array('log', (array) config('mail.mailers.failover.mailers', []), true)) {
            $problems[] = "The failover chain ends at 'log', so a primary failure is silently swallowed instead of surfaced.";
        }

        $from = (string) config('mail.from.address');

        if (str_ends_with($from, 'example.com') || str_ends_with($from, 'example.org')) {
            $problems[] = "MAIL_FROM_ADDRESS is still the placeholder ({$from}) — providers reject or spam-filter it.";
        }

        $problems = [...$problems, ...$this->senderBelongsToTheConfiguredProvider($transport, $from)];

        if (! config('otp.hmac_key') && ! config('app.key')) {
            $problems[] = 'Neither OTP_HMAC_KEY nor APP_KEY is set, so codes cannot be signed.';
        }

        return $problems;
    }

    /**
     * Catches a sender left over from a different mail provider.
     *
     * Providers accept a message at the SMTP layer and only validate the From
     * domain afterwards, so a mismatched sender reports as a successful send and
     * is then discarded without a bounce reaching the application. Switching
     * MAIL_MAILER without switching MAIL_FROM_ADDRESS is the easy way to hit it:
     * moving off Resend's `onboarding@resend.dev` sandbox sender to Brevo's SMTP
     * relay leaves a resend.dev From that Brevo has no reason to accept.
     *
     * The sandbox sender is called out specifically because it is the one value
     * that is correct for exactly one provider and silently wrong for all the
     * others.
     *
     * @return array<int, string>
     */
    private function senderBelongsToTheConfiguredProvider(string $transport, string $from): array
    {
        if ($from === '' || $transport === 'log' || $transport === 'array') {
            return [];
        }

        $problems = [];

        $sandboxSenders = [
            'resend.dev' => 'Resend',
        ];

        $fromDomain = strtolower(substr(strrchr($from, '@') ?: '', 1));

        if (isset($sandboxSenders[$fromDomain]) && $transport !== 'resend') {
            $problems[] = "MAIL_FROM_ADDRESS ({$from}) is {$sandboxSenders[$fromDomain]}'s shared sandbox sender, but MAIL_MAILER is '{$transport}'. "
                .'Providers check the From domain after accepting the message, so this sends successfully and is then dropped with no bounce. '
                .'Set MAIL_FROM_ADDRESS to a sender verified in the configured provider.';
        }

        return $problems;
    }
}
