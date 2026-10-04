<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the contact details captured at sign-up.
 *
 * Phone is not added to a table here: `users.phone` has existed since the
 * original users migration and is already carried by UserResource,
 * SeekerResource and EmployerResource and already editable on both settings
 * screens. It was optional and entirely unvalidated, so what this migration
 * adds is the index that makes a lookup on it sane, while the validation and the
 * canonical storage format live in App\Support\Phone.
 *
 * Address is genuinely new — the schema only ever had a free-text `location`
 * string on profiles and companies. Location stays exactly as it was because
 * eight display sites and the companies-directory location filter all read it,
 * and `location` is now derived from city and state instead of being typed in.
 * That keeps "Lagos" and "Lagos, Lagos State" from diverging into two spellings
 * of the same place, which is what a free-text location always becomes.
 *
 * `state` is deliberately not constrained to the 36 states plus the FCT at the
 * database level. The list is enforced in the controllers from config, so
 * widening it later is a config change rather than a migration that has to
 * rewrite every row.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->string('address_line')->nullable()->after('location');
            $table->string('city', 120)->nullable()->after('address_line');
            $table->string('state', 120)->nullable()->after('city');

            // Job matching filters on city and state together.
            $table->index(['state', 'city']);
        });

        Schema::table('companies', function (Blueprint $table): void {
            $table->string('address_line')->nullable()->after('location');
            $table->string('city', 120)->nullable()->after('address_line');
            $table->string('state', 120)->nullable()->after('city');
        });

        // Not a unique index: see App\Support\Phone for why a phone number is
        // deliberately allowed to appear on more than one account.
        Schema::table('users', function (Blueprint $table): void {
            $table->index('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['phone']);
        });

        Schema::table('companies', function (Blueprint $table): void {
            $table->dropColumn(['address_line', 'city', 'state']);
        });

        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropIndex(['state', 'city']);
            $table->dropColumn(['address_line', 'city', 'state']);
        });
    }
};