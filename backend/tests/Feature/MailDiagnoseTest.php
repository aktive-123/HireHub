<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * The mail diagnostics command exists because a misconfigured mailer is
 * invisible from the code: the send reports success and the message vanishes.
 * These cover the cases where the configuration is provably wrong rather than
 * merely suspicious.
 */
class MailDiagnoseTest extends TestCase
{
    public function test_a_healthy_smtp_setup_reports_no_problems(): void
    {
        config([
            'mail.enabled' => true,
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp-relay.brevo.com',
            'mail.mailers.smtp.username' => 'account@smtp-brevo.com',
            'mail.from.address' => 'no-reply@hirehub.test',
            'mail.from.name' => 'HireHub',
        ]);

        $this->artisan('mail:diagnose')
            ->assertExitCode(0);
    }

    /**
     * The case this exists for. Moving MAIL_MAILER off Resend while leaving
     * Resend's sandbox sender behind produces a send that reports success and is
     * then dropped by the provider, because the From domain is only validated
     * after the message is accepted.
     */
    public function test_it_flags_a_sandbox_sender_left_behind_by_a_provider_switch(): void
    {
        config([
            'mail.enabled' => true,
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp-relay.brevo.com',
            'mail.mailers.smtp.username' => 'account@smtp-brevo.com',
            'mail.from.address' => 'onboarding@resend.dev',
        ]);

        $this->artisan('mail:diagnose')
            ->expectsOutputToContain("MAIL_FROM_ADDRESS (onboarding@resend.dev) is Resend's shared sandbox sender")
            ->assertExitCode(1);
    }

    /**
     * The same sender is correct while the Resend transport is actually in use,
     * so the check has to be about the pairing rather than the address alone.
     */
    public function test_it_accepts_the_resend_sandbox_sender_on_the_resend_transport(): void
    {
        config([
            'mail.enabled' => true,
            'mail.default' => 'resend',
            'mail.from.address' => 'onboarding@resend.dev',
        ]);

        $this->artisan('mail:diagnose')
            ->assertExitCode(0);
    }

    public function test_it_flags_a_disabled_mailer_because_nothing_would_be_sent(): void
    {
        config([
            'mail.enabled' => false,
            'mail.default' => 'log',
            'mail.from.address' => 'no-reply@hirehub.test',
        ]);

        $this->artisan('mail:diagnose')
            ->expectsOutputToContain('MAIL_ENABLED is false')
            ->assertExitCode(1);
    }

    public function test_it_flags_remote_smtp_without_a_username(): void
    {
        config([
            'mail.enabled' => true,
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp-relay.brevo.com',
            'mail.mailers.smtp.username' => null,
            'mail.from.address' => 'no-reply@hirehub.test',
        ]);

        $this->artisan('mail:diagnose')
            ->expectsOutputToContain('MAIL_USERNAME is empty')
            ->assertExitCode(1);
    }

    /**
     * With nothing to send to, the command only reports; it must not attempt a
     * delivery as a side effect of being run for diagnostics.
     */
    public function test_running_it_without_a_recipient_does_not_send_anything(): void
    {
        config([
            'mail.enabled' => true,
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp-relay.brevo.com',
            'mail.mailers.smtp.username' => 'account@smtp-brevo.com',
            'mail.from.address' => 'no-reply@hirehub.test',
        ]);

        \Illuminate\Support\Facades\Mail::fake();

        $this->artisan('mail:diagnose')->assertExitCode(0);

        \Illuminate\Support\Facades\Mail::assertNothingSent();
    }
}