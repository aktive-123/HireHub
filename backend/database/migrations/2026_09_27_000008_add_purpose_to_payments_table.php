<?php

use App\Enums\PaymentPurpose;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            // A placement fee is a one-off charge, not a subscription, so it
            // has no plan behind it. Making plan_id nullable lets both kinds of
            // charge share one table — and therefore one webhook pipeline, one
            // replay-dedupe index and one amount-verification path — instead of
            // the second charge type having to reimplement all of it.
            $table->foreignId('plan_id')->nullable()->change();

            // What the money was for. `plan_id` alone can no longer distinguish
            // a subscription from a fee, and the entitlement granted on success
            // depends entirely on this.
            $table->string('purpose')->default(PaymentPurpose::Subscription->value)->index();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropColumn(['purpose']);
        });
    }
};
