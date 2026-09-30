<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();

            $table->string('gateway')->index();
            $table->string('event_type')->index();
            $table->string('gateway_event_id')->nullable();

            $table->unsignedSmallInteger('attempts')->default(1);
            $table->text('error')->nullable();
            $table->timestamp('processed_at')->nullable();

            // Raw payload retained for dispute handling and audit. Payment data
            // is gateway-side; this holds no card numbers.
            $table->json('payload')->nullable();
            $table->timestamps();

            // Replay protection: the same gateway event can never be applied
            // twice, so a retried or duplicated webhook is a no-op.
            $table->unique(['gateway', 'gateway_event_id'], 'payment_events_gateway_event_unique');
            $table->index(['payment_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_events');
    }
};
