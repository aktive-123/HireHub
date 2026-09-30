<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();

            $table->string('status')->default('trialing')->index();
            $table->string('gateway')->nullable();

            $table->timestamp('starts_at')->nullable();
            $table->timestamp('current_period_end')->nullable()->index();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            // Set when the subscription is superseded or cancelled. The live
            // row keeps this NULL, which is what active_company_id keys off.
            $table->timestamp('superseded_at')->nullable();

            $table->timestamps();

            $table->index(['company_id', 'current_period_end']);

            // A company may hold only one live subscription while keeping full
            // history. A generated column expresses that portably: it is NULL
            // for every ended row (repeated NULLs are allowed in a unique
            // index) but equals company_id for the single live row, so the
            // database rejects a second active subscription even if two
            // checkout requests race.
            $table->unsignedBigInteger('active_company_id')
                ->nullable()
                ->storedAs('case when `superseded_at` is null then `company_id` else null end');
            $table->unique('active_company_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
