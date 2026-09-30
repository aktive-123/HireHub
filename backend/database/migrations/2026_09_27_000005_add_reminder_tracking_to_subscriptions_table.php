<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            // Stamped when the "your plan ends in N days" email goes out, so the
            // nightly sweep can run every day without emailing the same
            // employer on every run. Reset whenever the period is rolled
            // forward by a renewal.
            $table->timestamp('expiry_reminder_sent_at')->nullable()->after('cancelled_at');

            // The plan this row was moved off, kept so a downgraded company's
            // billing history still explains what it used to pay for.
            $table->foreignId('downgraded_from_plan_id')->nullable()->after('plan_id')->constrained('plans')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropColumn(['expiry_reminder_sent_at', 'downgraded_from_plan_id']);
        });
    }
};
