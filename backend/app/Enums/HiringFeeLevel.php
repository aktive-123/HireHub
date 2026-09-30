<?php

namespace App\Enums;

/**
 * The four hiring-fee tiers.
 *
 * `jobs.level` is a free-text string an employer picks from a dropdown, and
 * the values that have been saved over the years are not consistent ("mid",
 * "Mid Level", "Mid-level", "Lead"). The stored value is therefore never
 * trusted for pricing: it is normalised through {@see self::fromJobLevel()},
 * and a level that cannot be recognised falls back to the entry tier rather
 * than silently pricing an executive hire at the entry rate.
 */
enum HiringFeeLevel: string
{
    case Entry = 'entry';
    case Mid = 'mid';
    case Senior = 'senior';
    case Executive = 'executive';

    /**
     * Ordered least to most senior. Used to pick a sensible fallback for a job
     * whose level cannot be parsed.
     */
    public function seniority(): int
    {
        return match ($this) {
            self::Entry => 1,
            self::Mid => 2,
            self::Senior => 3,
            self::Executive => 4,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Entry => 'Entry Level',
            self::Mid => 'Mid Level',
            self::Senior => 'Senior',
            self::Executive => 'Executive / C-level',
        };
    }

    /**
     * Map a stored `jobs.level` string onto a pricing tier.
     *
     * Substring matching rather than an exact lookup, so "Mid-level",
     * "Mid Level" and "mid" all land on the same tier. Ordered most-specific
     * first: "c-level" and "executive" both contain neither of the shorter
     * tokens, but checking senior before mid matters for values like
     * "Senior Manager, Data".
     */
    public static function fromJobLevel(?string $value): self
    {
        $normalised = strtolower(trim((string) $value));

        if ($normalised === '') {
            return self::Entry;
        }

        return match (true) {
            str_contains($normalised, 'executive'),
            str_contains($normalised, 'c-level'),
            str_contains($normalised, 'c level'),
            str_contains($normalised, 'chief'),
            str_contains($normalised, 'ceo'),
            str_contains($normalised, 'cto'),
            str_contains($normalised, 'cfo'),
            str_contains($normalised, 'coo'),
            str_contains($normalised, 'president'),
            str_contains($normalised, 'vp'),
            str_contains($normalised, 'vice-president'),
            str_contains($normalised, 'vice president'),
            str_contains($normalised, 'board') => self::Executive,

            str_contains($normalised, 'senior'),
            str_contains($normalised, 'sr.'),
            str_contains($normalised, 'snr'),
            str_contains($normalised, 'lead'),
            str_contains($normalised, 'principal'),
            str_contains($normalised, 'staff'),
            str_contains($normalised, 'director'),
            str_contains($normalised, 'head of') => self::Senior,

            str_contains($normalised, 'mid'),
            str_contains($normalised, 'intermediate'),
            str_contains($normalised, 'experienced') => self::Mid,

            default => self::Entry,
        };
    }
}
