<?php

namespace App\Services\Upsell;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\JobSeekerUpsell;

/**
 * The add-ons a job seeker can buy, and when they are allowed to buy them.
 *
 * Prices live here rather than in the database because there is one product and
 * it is not a thing an admin edits: a single source in code means the amount
 * charged is the amount shown, and there is no row that can be repiced between
 * rendering the offer and opening checkout. If this ever grows into a catalogue
 * an admin curates, it becomes a table and this becomes a repository over it —
 * the rest of the code only ever calls {@see self::availableFor()}.
 */
class UpsellCatalogue
{
    /**
     * The single product. Kept deliberately small: the point of an upsell is
     * to be offered after something good has already happened, and a wall of
     * options at that moment reads as a paywall.
     *
     * Amount is in minor units (kobo), like every other amount in the system.
     */
    public const PRODUCTS = [
        'interview_prep' => [
            'name' => 'Interview Prep Pack',
            'amount' => 15_000_00,
            'currency' => 'NGN',
            'summary' => 'A 45-minute mock interview with a hiring manager on our panel, plus a written breakdown of what they looked for.',
            'features' => [
                '45-minute mock interview, live',
                'Written feedback within 24 hours',
                'Reschedule once, free',
            ],
            'billing_period' => 'once',
        ],
    ];

    /**
     * Products a seeker may still buy against this application, each already
     * stripped of any that have already been paid for.
     *
     * Gated on the hire being accepted rather than on the offer being made:
     * selling interview coaching to someone who has not yet decided to take the
     * job is both worse for them and a much harder refund story.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function availableFor(Application $application): array
    {
        if ($application->status !== ApplicationStatus::Hired) {
            return [];
        }

        $owned = JobSeekerUpsell::query()
            ->where('application_id', $application->id)
            ->settled()
            ->pluck('sku')
            ->all();

        $available = [];

        foreach (self::PRODUCTS as $sku => $product) {
            if (in_array($sku, $owned, true)) {
                continue;
            }

            $available[] = ['sku' => $sku] + $product;
        }

        return $available;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function find(string $sku): ?array
    {
        return self::PRODUCTS[$sku] ?? null;
    }
}
