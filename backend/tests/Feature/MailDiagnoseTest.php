<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
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
            // One-time passwords bypass the SMTP mailer and go through the
            // Brevo API, so "healthy" has to include this key or the command
            // is right to complain.
            'services.brevo.api_key' => 'xkeysib-test-key',
        ]);

        $this->artisan('mail:diagnose')
            ->assertExitCode(0);
    }

    /**
     * The gap this exists for. A fully working SMTP setup reports "healthy"
     * while every one-time password fails, because codes are delivered over
     * the Brevo HTTP API with a different credential — so the mailer can be
     * perfect and members still report that no code ever arrives.
     */
    public function test_it_flags_a_missing_brevo_key_even_when_smtp_is_healthy(): void
    {
        config([
            'mail.enabled' => true,
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp-relay.brevo.com',
            'mail.mailers.smtp.username' => 'account@smtp-brevo.com',
            'mail.from.address' => 'no-reply@hirehub.test',
            'services.brevo.api_key' => null,
        ]);

        $this->artisan('mail:diagnose')
            ->expectsOutputToContain('BREVO_API_KEY is not set')
            ->assertExitCode(1);
    }

    /**
     * A disabled mailer already fails the command, so a missing Brevo key is not
     * a second thing to report — it would only bury the first.
     */
    public function test_it_does_not_also_complain_about_brevo_when_mail_is_off(): void
    {
        config([
            'mail.enabled' => false,
            'mail.default' => 'log',
            'services.brevo.api_key' => null,
        ]);

        $this->artisan('mail:diagnose')
            ->doesntExpectOutputToContain('BREVO_API_KEY')
            ->assertExitCode(1);
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
            'services.brevo.api_key' => 'xkeysib-test-key',
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
            'services.brevo.api_key' => 'xkeysib-test-key',
        ]);

        Mail::fake();

        $this->artisan('mail:diagnose')->assertExitCode(0);

        Mail::assertNothingSent();
    }

    /**
     * The --to send has to take the same route as a real code, or the command
     * would prove the wrong thing: a green test send over SMTP while every
     * actual code goes over the Brevo API and fails.
     */
    public function test_a_real_send_goes_through_the_brevo_api_like_a_real_code(): void
    {
        config([
            'mail.enabled' => true,
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp-relay.brevo.com',
            'mail.mailers.smtp.username' => 'account@smtp-brevo.com',
            'mail.from.address' => 'no-reply@hirehub.test',
            'mail.from.name' => 'HireHub',
            'services.brevo.api_key' => 'xkeysib-test-key',
        ]);

        Mail::fake();
        Http::preventStrayRequests();
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response(['messageId' => 'fake-message-id'], 201),
        ]);

        $this->artisan('mail:diagnose', ['--to' => 'ops@hirehub.test', '--purpose' => 'verify'])
            ->assertExitCode(0);

        Http::assertSent(fn ($request): bool => $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && ($request->data()['to'][0]['email'] ?? null) === 'ops@hirehub.test');
        Mail::assertNothingSent();
    }

    /**
     * With mail disabled Otp::deliver() writes the code to the log and returns
     * without raising, so the command must say so rather than report a delivery
     * that never happened.
     */
    public function test_a_real_send_fails_loudly_when_mail_is_disabled(): void
    {
        config([
            'mail.enabled' => false,
            'mail.default' => 'log',
            'mail.from.address' => 'no-reply@hirehub.test',
            'services.brevo.api_key' => 'xkeysib-test-key',
        ]);

        Mail::fake();
        Http::preventStrayRequests();

        $this->artisan('mail:diagnose', ['--to' => 'ops@hirehub.test'])
            ->expectsOutputToContain('MAIL_ENABLED is false — the code would only be written to the log.')
            ->assertExitCode(1);

        Http::assertNothingSent();
        Mail::assertNothingSent();
    }
}
