<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Records that an account is holding a password somebody else chose.
 *
 * When an admin resets somebody's password there are two honest options: mail
 * the temporary password and hope the recipient rotates it, or mark the account
 * as owing a change and make the application itself insist. This column is what
 * makes the second one possible, and without it an admin-issued password is a
 * permanent credential the moment it is read out of an email.
 *
 * A timestamp of the last change would not do the job: it cannot distinguish
 * "this password was set by an admin and has not been replaced yet" from "this
 * password is old but entirely the owner's own", and only the first of those
 * should block normal use of the account.
 *
 * Additive only. One nullable-in-spirit boolean that defaults to false, so every
 * existing row is immediately and correctly "no change owed" without a backfill:
 * no existing account is affected, and the default is what the overwhelming
 * majority of rows will hold anyway.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('must_change_password')
                ->default(false)
                ->after('password_reset_grant_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('must_change_password');
        });
    }
};
