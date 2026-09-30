<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // A password reset is a two-step exchange: prove the address with
            // a code, then spend a separate short-lived grant on the actual
            // change. The grant is stored hashed and cleared as it is spent, so
            // the six-digit code is burned at the verification step and this
            // column can never be brute forced — the same six digits are only a
            // million values.
            $table->string('password_reset_grant_hash', 64)->nullable()->after('remember_token');
            $table->timestamp('password_reset_grant_expires_at')->nullable()->after('password_reset_grant_hash');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['password_reset_grant_hash', 'password_reset_grant_expires_at']);
        });
    }
};
