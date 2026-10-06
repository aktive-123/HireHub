<?php

namespace App\Support;

use Illuminate\Validation\Rule;

/**
 * Address capture, and the one string the rest of the application reads.
 *
 * The platform previously had only a free-text `location`, typed by hand in
 * eight places and read by eight others. That is how a single city ends up
 * spelled four ways across the companies directory, the search filter and two
 * profile pages, which then makes "Lagos" and "Lagos State" filter as different
 * places. City and state are therefore captured as their own values and
 * `location` is derived from them, so there is exactly one spelling of each
 * place in the database.
 *
 * Street address is separate from that derivation on purpose: it is a line of
 * prose that varies per site and belongs in no filter, so it is never folded
 * into `location`.
 *
 * It is published on the public company profile, because that is a business
 * address and knowing where a company is actually based is ordinary context for
 * an applicant. The same field is deliberately *not* added to SeekerResource:
 * a seeker's street address is a home address, and unlike a company's it is
 * nobody's business until the seeker chooses to share it.
 */
class Address
{
    /**
     * Minimum useful length for a street address. Short enough to allow
     * "12 Admiralty Way", long enough to reject a stray character.
     */
    private const MIN_STREET_LENGTH = 5;

    /**
     * @return array<string, array<int, mixed>>
     */
    public static function rules(bool $required = true, bool $streetRequired = false): array
    {
        return [
            'address_line' => self::streetRules($streetRequired),
            'city' => self::cityRules($required),
            'state' => self::stateRules($required),
        ];
    }

    /**
     * @return array<int, mixed>
     */
    public static function streetRules(bool $required = false): array
    {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'max:255',
            'min:'.self::MIN_STREET_LENGTH,
        ];
    }

    /**
     * @return array<int, mixed>
     */
    public static function cityRules(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'max:120',
        ];
    }

    /**
     * Constrained to the configured list rather than left free text, because a
     * state name is a closed set and a typo in it would silently create a new
     * place that no employer ever filters on.
     *
     * @return array<int, mixed>
     */
    public static function stateRules(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'max:120',
            Rule::in(self::states()),
        ];
    }

    /**
     * The display string every location read on the site uses.
     *
     * Falls back to whichever half was filled in so a half-completed profile
     * still shows something useful instead of an empty slot, and returns null
     * when neither is present so callers can treat "no location" as absent
     * rather than as an empty string they have to check for separately.
     */
    public static function location(?string $city, ?string $state): ?string
    {
        $city = $city !== null ? trim($city) : '';
        $state = $state !== null ? trim($state) : '';

        return match (true) {
            $city !== '' && $state !== '' => $city.', '.$state,
            $city !== '' => $city,
            default => $state !== '' ? $state : null,
        };
    }

    /**
     * @return array<int, string>
     */
    public static function states(): array
    {
        return (array) config('regions.states', []);
    }
}
