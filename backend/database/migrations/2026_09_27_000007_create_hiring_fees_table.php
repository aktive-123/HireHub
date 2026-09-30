<?php

use App\Enums\PaymentStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hiring_fees', function (Blueprint $table) {
            $table->id();

            // The employer is the payer. `user_id` is the account that made the
            // payment, `company_id` is the hiring entity the fee is attributed
            // to. They are the same person in practice today, but the billing
            // figure the admin console groups by is the company, and keeping
            // both means a future "paying on behalf of" flow needs no migration.
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            $table->foreignId('job_id')->constrained()->cascadeOnDelete();

            // The application this fee unlocks. Unique: one hire, one fee. A
            // second confirmed hire for the same application is a data
            // corruption, not a legitimate second charge, so the database
            // refuses it rather than trusting the caller to check.
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->unique('application_id');

            // The rate row that priced this fee. Set null on delete rather than
            // cascading: a settled payment must keep its amount even if an
            // admin later deletes the rate, or the collected-revenue totals
            // would silently shrink.
            $table->foreignId('hiring_fee_rate_id')->nullable()->constrained()->nullOnDelete();

            // The transaction record in `payments`, which is where the gateway
            // conversation actually lives. Null only while a fee row exists
            // without a payment (the quoted-but-unpaid state).
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();

            // Amount in the currency's minor unit, copied at quote time so a
            // later rate change never rewrites what was actually charged.
            $table->unsignedBigInteger('amount');
            $table->string('currency', 3)->default('NGN');

            // The job's level at the time of the quote, kept denormalised so
            // historical fees stay explainable after the level is edited.
            $table->string('level')->nullable();

            // Basis points actually applied, when the fee was priced by
            // percentage. Null for a purely flat fee.
            $table->unsignedInteger('percentage_applied')->nullable();

            $table->string('status')->default(PaymentStatus::Pending->value)->index();
            $table->string('reference')->unique();

            $table->timestamp('paid_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index(['job_id', 'status']);
            $table->index(['status', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hiring_fees');
    }
};
