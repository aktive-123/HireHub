<?php

namespace Database\Seeders;

use App\Enums\HiringFeeLevel;
use App\Enums\PaymentPurpose;
use App\Enums\PaymentStatus;
use App\Models\Application;
use App\Models\HiringFee;
use App\Models\HiringFeeRate;
use App\Models\Payment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class HiringFeeSeeder extends Seeder
{
    public function run(): void
    {
        // The demo dataset already contains applications in the `hired` state.
        // Leaving them without a fee would contradict the rule the application
        // enforces — a hire exists only once it has been paid for — and would
        // also give the admin revenue dashboard nothing to show. So each seeded
        // hire gets a matching settled fee, priced by the same rule the live
        // checkout uses.
        $hired = Application::query()
            ->where('status', 'hired')
            ->with(['job', 'job.company', 'seeker'])
            ->get();

        foreach ($hired as $application) {
            $job = $application->job;

            if (! $job) {
                continue;
            }

            $level = HiringFeeLevel::fromJobLevel($job->level);
            $rate = HiringFeeRate::where('level', $level)->whereNull('category_id')->first();
            $amount = (int) ($rate?->flat_amount ?? 0);

            // Only a real transaction should look settled, so a payment row is
            // written alongside rather than the fee being marked paid by hand.
            $payment = Payment::updateOrCreate(
                ['reference' => 'hhfee_seed_'.str_pad((string) $application->id, 6, '0', STR_PAD_LEFT)],
                [
                    'user_id' => $job->user_id ?? $job->company?->user_id,
                    'company_id' => $job->company_id,
                    'plan_id' => null,
                    'purpose' => PaymentPurpose::HiringFee,
                    'gateway' => 'paystack',
                    'status' => PaymentStatus::Succeeded,
                    'amount' => $amount,
                    'currency' => 'NGN',
                    'billing_period' => 'one-off',
                    'gateway_reference' => 'SEED-'.Str::upper(Str::random(12)),
                    'paid_at' => now()->subDays(random_int(1, 20)),
                    'meta' => ['seeded' => true],
                ]
            );

            HiringFee::updateOrCreate(
                ['application_id' => $application->id],
                [
                    'employer_id' => $job->user_id ?? $job->company?->user_id,
                    'company_id' => $job->company_id,
                    'job_id' => $job->id,
                    'hiring_fee_rate_id' => $rate?->id,
                    'payment_id' => $payment->id,
                    'amount' => $amount,
                    'currency' => 'NGN',
                    'level' => $level,
                    'percentage_applied' => null,
                    'status' => PaymentStatus::Succeeded,
                    'reference' => $payment->reference,
                    'paid_at' => $payment->paid_at,
                    'confirmed_at' => $payment->paid_at,
                    'meta' => ['seeded' => true, 'basis' => 'flat'],
                ]
            );
        }
    }
}
