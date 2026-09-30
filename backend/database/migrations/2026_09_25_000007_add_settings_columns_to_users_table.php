<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Persists the account-settings screens.
 *
 * Both settings pages previously rendered a green "your settings have been
 * updated" confirmation while submitting nothing at all, because none of these
 * values had anywhere to live. Rather than delete the preference panels, the
 * columns they need are added here so the form can be made honest.
 *
 * The boolean preferences are grouped by channel (email / push / privacy)
 * instead of being flattened into one column per checkbox, so a new preference
 * does not require a migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('timezone', 64)->default('UTC')->after('phone');

            // TOTP enrolment state. Deliberately not implemented as a real
            // second factor yet — this only records the user's intent so the
            // toggle round-trips truthfully. Enabling it must never be
            // presented as active security until the flow exists.
            $table->boolean('two_factor_enabled')->default(false)->after('timezone');

            $table->json('email_preferences')->nullable()->after('two_factor_enabled');
            $table->json('notification_preferences')->nullable()->after('email_preferences');
            $table->json('privacy_preferences')->nullable()->after('notification_preferences');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'timezone',
                'two_factor_enabled',
                'email_preferences',
                'notification_preferences',
                'privacy_preferences',
            ]);
        });
    }
};
