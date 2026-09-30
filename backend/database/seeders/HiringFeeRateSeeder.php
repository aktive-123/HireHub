<?php

namespace Database\Seeders;

use App\Enums\HiringFeeLevel;
use App\Models\HiringFeeRate;
use Illuminate\Database\Seeder;

class HiringFeeRateSeeder extends Seeder
{
    public function run(): void
    {
        // Amounts are in kobo, like every other money column in this database,
        // so no float rounding is possible. updateOrCreate keyed on the level
        // means re-seeding resets an edited rate back to the default — which is
        // what "seed these as default rates" means, and why the admin console
        // is the thing to edit if the values need to differ in production.
        $rates = [
            [
                'level' => HiringFeeLevel::Entry,
                'flat_amount' => 1_250_000,      // ₦12,500
                'percentage_override' => null,
            ],
            [
                'level' => HiringFeeLevel::Mid,
                'flat_amount' => 3_000_000,      // ₦30,000
                'percentage_override' => null,
            ],
            [
                'level' => HiringFeeLevel::Senior,
                'flat_amount' => 6_000_000,      // ₦60,000
                'percentage_override' => null,
            ],
            [
                'level' => HiringFeeLevel::Executive,
                'flat_amount' => 12_500_000,     // ₦125,000
                // 500 basis points = 5% of the listed annual salary, charged
                // instead of the flat rate whenever it comes out higher.
                'percentage_override' => 500,
            ],
        ];

        foreach ($rates as $index => $rate) {
            HiringFeeRate::updateOrCreate(
                ['level' => $rate['level']->value, 'category_id' => null],
                [
                    'flat_amount' => $rate['flat_amount'],
                    'currency' => 'NGN',
                    'percentage_override' => $rate['percentage_override'],
                    'use_greater_of' => true,
                    'is_active' => true,
                    'sort_order' => $index,
                ]
            );
        }
    }
}
