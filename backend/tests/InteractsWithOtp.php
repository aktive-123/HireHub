<?php

namespace Tests;

use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Monolog\Logger;

/**
 * Gives tests a deterministic way to read a one-time password.
 *
 * The application never persists a code in plaintext — only an HMAC of it — so
 * a test cannot simply look one up in the database. The one place the plaintext
 * legitimately appears is the `otp-codes` log channel, which `Otp::deliver()`
 * writes to when `mail.enabled` is off, so that is what these helpers read.
 *
 * The channel is redirected to an in-memory Monolog `TestHandler` rather than
 * to `storage/logs/otp-codes.log`. That keeps three promises:
 *
 *  - a test never depends on the developer's `MAIL_ENABLED` value in `.env`;
 *  - tests cannot leak codes into a log file the developer will later read;
 *  - on Windows nothing tries to unlink a file that Monolog still holds open,
 *    which fails with a sharing violation and is miserable to debug.
 */
trait InteractsWithOtp
{
    private ?TestHandler $otpLogHandler = null;

    private ?TestHandler $otpStatusLogHandler = null;

    /**
     * Redirect the OTP log channel before the test issues anything.
     *
     * This has to happen in setUp rather than lazily on first read: a test that
     * requests a code and only afterwards asks for the plaintext would otherwise
     * let the code reach the real log file before the channel is swapped.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->otpLog();
        $this->otpStatusLog();
    }

    /**
     * Force the log-delivery path and return the handler capturing it.
     */
    protected function otpLog(): TestHandler
    {
        if ($this->otpLogHandler === null) {
            config(['mail.enabled' => false]);

            $this->otpLogHandler = new TestHandler;
            $this->otpLogHandler->setSkipReset(true);

            $logger = new Logger('otp-codes-test');
            $logger->pushHandler($this->otpLogHandler);

            Log::extend('otp-codes-test', fn () => $logger);
            config(['logging.channels.otp-codes' => ['driver' => 'otp-codes-test']]);

            // The manager caches a resolved channel by name, so an
            // already-resolved `otp-codes` would keep writing to the real file.
            Log::forgetChannel('otp-codes');
        }

        return $this->otpLogHandler;
    }

    protected function otpStatusLog(): TestHandler
    {
        if ($this->otpStatusLogHandler === null) {
            $this->otpStatusLogHandler = new TestHandler;
            $logger = new Logger('otp-status-test');
            $logger->pushHandler($this->otpStatusLogHandler);

            Log::extend('otp-status-test', fn () => $logger);
            config(['logging.channels.stderr' => ['driver' => 'otp-status-test']]);
            Log::forgetChannel('stderr');
        }

        return $this->otpStatusLogHandler;
    }

    /**
     * Forget every code captured so far, so the next assertion only sees codes
     * issued after this call.
     */
    protected function clearOtpLog(): void
    {
        $this->otpLog()->clear();
    }

    /**
     * Every captured line, newest last.
     *
     * @return list<string>
     */
    protected function otpLogMessages(): array
    {
        return array_map(
            static fn ($record): string => (string) $record->message,
            $this->otpLog()->getRecords(),
        );
    }

    /**
     * The plaintext of the most recently issued code, optionally restricted to
     * one purpose, or null when nothing matching was issued.
     */
    protected function latestOtpCode(?string $email = null, ?string $purpose = null): ?string
    {
        $pattern = '/HireHub OTP \[(?P<purpose>\w+)\] for (?P<email>\S+): (?P<code>\d{6})/';

        $code = null;

        foreach ($this->otpLogMessages() as $line) {
            if (! preg_match($pattern, $line, $m)) {
                continue;
            }

            if ($purpose !== null && $m['purpose'] !== $purpose) {
                continue;
            }

            if ($email !== null && $m['email'] !== $email) {
                continue;
            }

            $code = $m['code'];
        }

        return $code;
    }

    /**
     * Whether any captured line mentions the given address at all, which is how
     * the "no mail, no code" half of an enumeration check is asserted.
     */
    protected function otpLogMentions(string $email): bool
    {
        foreach ($this->otpLogMessages() as $line) {
            if (str_contains($line, $email)) {
                return true;
            }
        }

        return false;
    }
}
