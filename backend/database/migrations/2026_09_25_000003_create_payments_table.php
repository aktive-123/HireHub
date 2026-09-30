<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();

            $table->string('gateway')->index();
            $table->string('status')->default('pending')->index();

            // Amount is copied from the plan at checkout time in minor units so
            // a later price change never rewrites history.
            $table->unsignedBigInteger('amount');
            $table->string('currency', 3);
            $table->string('billing_period')->default('monthly');

            // Our reference sent to the gateway, and the gateway's own id.
            // Both are unique so a replayed webhook cannot create a second row.
            $table->string('reference')->unique();
            $table->string('gateway_reference')->nullable()->unique();

            $table->string('checkout_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
