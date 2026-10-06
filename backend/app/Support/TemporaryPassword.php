<?php

namespace App\Support;

use RuntimeException;

/**
 * Generates the throwaway passwords the platform hands out on a reset.
 *
 * Two callers need this — the `admin:create` console command and the admin
 * password reset endpoint — and they must not drift, because the properties
 * below are the whole reason the platform is willing to email a credential at
 * all:
 *
 *  - Long enough that it is not guessable. Twenty-four characters from a
 *    sixty-plus character alphabet is roughly 145 bits.
 *  - Unambiguous. l/1/I/O/0 are excluded so the password can be read off a
 *    screen and typed back without a support ticket about which character it
 *    was. This matters more than usual here, because the value is frequently
 *    read out over the phone.
 *  - Shell-safe. No quotes, backslashes, $, backticks or `!`, so it survives
 *    being pasted into a terminal, a password field or a ticket without being
 *    mangled or triggering history expansion.
 *  - Satisfies a composition rule without looking like one, since the four
 *    character classes are only guaranteed to be present, never positioned.
 */
final class TemporaryPassword
{
    /**
     * One string per character class: lower, upper, digit, symbol.
     */
    private const ALPHABET = [
        'abcdefghijkmnopqrstuvwxyz',
        'ABCDEFGHJKLMNPQRSTUVWXYZ',
        '23456789',
        '-_.@#%+*=?',
    ];

    private const LENGTH = 24;

    /**
     * The bcrypt input limit. Silently truncating beyond it would make the
     * tail of a long password decorative, so it is refused instead.
     */
    private const BCRYPT_LIMIT = 72;

    public static function generate(): string
    {
        $characters = '';

        foreach (self::ALPHABET as $class) {
            $characters .= $class[random_int(0, strlen($class) - 1)];
        }

        $pool = implode('', self::ALPHABET);

        while (strlen($characters) < self::LENGTH) {
            $characters .= $pool[random_int(0, strlen($pool) - 1)];
        }

        $shuffled = str_shuffle($characters);

        // str_shuffle is free to return its input unchanged, which would ship a
        // password with its composition rule legible in the first four
        // characters. Astronomically unlikely, but the retry is free.
        return $shuffled === $characters ? self::generate() : $shuffled;
    }

    /**
     * Reject a caller-supplied password that the stored hash could not fully
     * represent.
     *
     * Length is checked here rather than at each call site so that no caller
     * can quietly create an account whose password is partly ignored at
     * verification time — which would look like a typo to the owner forever.
     *
     * @throws RuntimeException
     */
    public static function assertStorable(string $password, int $minLength): void
    {
        if (strlen($password) > self::BCRYPT_LIMIT) {
            throw new RuntimeException(sprintf(
                'A password cannot be longer than %d characters.',
                self::BCRYPT_LIMIT
            ));
        }

        if (mb_strlen($password) < $minLength) {
            throw new RuntimeException(sprintf(
                'A password must be at least %d characters.',
                $minLength
            ));
        }
    }
}
