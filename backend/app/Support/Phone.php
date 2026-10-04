<?php

namespace App\Support;

use Closure;

/**
 * Nigerian phone numbers, stored in exactly one shape.
 *
 * The same handset is typed a dozen ways — 08012345678, +234 801 234 5678,
 * (0801) 234-5678, 002348012345678 — and all of them are the same number. If
 * each spelling were stored as typed then a lookup on the formatted value would
 * miss the row saved from the plain one, and no amount of uniqueness would stop
 * the same person registering twice under two spellings.
 *
 * So `users.phone` holds canonical E.164 (`+2348012345678`) no matter how it
 * arrived, and every screen that displays it formats it back out for a human.
 *
 * Deliberately not unique: this codebase treats an auth response that varies
 * with whether an account exists as an enumeration oracle (see
 * VerificationController::forgotPassword), and a uniqueness violation on signup
 * is exactly that. Shared switchboards, family members on one handset and
 * recruiters placing many candidates on one number all make uniqueness wrong
 * here regardless.
 */
class Phone
{
    public const COUNTRY_CODE = '+234';

    /**
     * The national mobile blocks are 070, 080 and 090. Requiring the leading 7,
     * 8 or 9 is what separates a mobile from a landline such as 0123 456 789,
     * which has no trunk-prefix-free 10-digit form starting that way.
     */
    private const NATIONAL_MOBILE = '/^(?:7|8|9)\d{9}$/';

    /**
     * Longest string of digits that could plausibly be a phone number. Anything
     * longer is a pasted sentence or a second number, and is rejected rather
     * than truncated into something valid.
     */
    private const MAX_DIGITS = 15;

    /**
     * Reduce any accepted spelling to canonical E.164, or null when the input
     * cannot be a Nigerian mobile number.
     */
    public static function normalize(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }

        $national = self::nationalNumber($input);

        return $national === null ? null : self::COUNTRY_CODE.$national;
    }

    public static function isValid(?string $input): bool
    {
        return self::normalize($input) !== null;
    }

    /**
     * Group the digits back into something readable without losing the
     * international prefix, so an applicant abroad can tell what was dialled.
     */
    public static function display(?string $input): ?string
    {
        $normalized = self::normalize($input);

        if ($normalized === null) {
            return null;
        }

        $national = substr($normalized, strlen(self::COUNTRY_CODE));

        return self::COUNTRY_CODE.' '.substr($national, 0, 3).' '.substr($national, 3, 3).' '.substr($national, 6);
    }

    /**
     * Validation rules for a phone input, shared so that signup, the profile
     * editor and the settings screen all accept exactly the same spellings and
     * all report the same message.
     *
     * The message is spelled out rather than left to Laravel's default for the
     * regex rule ("The phone field format is invalid."), because a rejected
     * phone number is the one field where the user needs to be told what shape
     * was expected.
     *
     * @return array<int, mixed>
     */
    public static function rules(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'max:32',
            function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value) || trim($value) === '') {
                    return;
                }

                if (! self::isValid($value)) {
                    $fail('Enter a valid Nigerian phone number, for example 0801 234 5678.');
                }
            },
        ];
    }

    /**
     * The 10-digit national number behind any accepted spelling.
     *
     * The prefixes are tried longest-first and in trunk-prefix order, because a
     * national number never begins with 0 while an international one may begin
     * with 00234, 234 or 0, and the candidates have to be tested rather than
     * stripped blindly — otherwise 2341234567 would lose a digit it needed.
     */
    private static function nationalNumber(string $input): ?string
    {
        $digits = preg_replace('/[^0-9]/', '', $input);

        if ($digits === null || $digits === '' || strlen($digits) > self::MAX_DIGITS) {
            return null;
        }

        foreach (['00234', '234', '0'] as $prefix) {
            if (! str_starts_with($digits, $prefix)) {
                continue;
            }

            $candidate = substr($digits, strlen($prefix));

            return preg_match(self::NATIONAL_MOBILE, $candidate) === 1 ? $candidate : null;
        }

        // Already a bare national number with no prefix to remove.
        return preg_match(self::NATIONAL_MOBILE, $digits) === 1 ? $digits : null;
    }
}