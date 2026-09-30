<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();

            // Nullable: a password-reset OTP has to be issuable for an address
            // without revealing whether an account exists, so the row is written
            // before (or without) a matching user ever being resolved.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->string('email')->index();
            $table->string('purpose', 16);

            // HMAC-SHA256 of the code, never the code itself.
            $table->string('code_hash', 64);

            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);

            // Client address the request came from, so the rate limiter can
            // count per (email, IP) without a separate cache key scheme.
            $table->string('ip_address', 45)->nullable();

            $table->timestamps();

            // The hot path is "latest unconsumed code for this email+purpose",
            // so that pair leads the index.
            $table->index(['email', 'purpose', 'id']);
            $table->index(['expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_codes');
    }
};
