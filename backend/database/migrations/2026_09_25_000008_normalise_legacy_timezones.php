<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The settings UI used to offer the abbreviations "WAT" and "GMT" as
     * timezone values. Neither exists in PHP's timezone_identifiers_list(), so
     * the settings endpoint rejected them with a 422 on save and any account
     * that had already stored one would render a blank select. The pickers now
     * only offer IANA identifiers; this maps the legacy values forward.
     */
    private const LEGACY_TIMEZONES = [
        'WAT' => 'Africa/Lagos',
        'GMT' => 'UTC',
        'EAT' => 'Africa/Nairobi',
        'CAT' => 'Africa/Lagos',
    ];

    public function up(): void
    {
        foreach (self::LEGACY_TIMEZONES as $legacy => $iana) {
            DB::table('users')
                ->where('timezone', $legacy)
                ->update(['timezone' => $iana]);
        }
    }

    public function down(): void
    {
        // Intentionally not reversible: expanding "Africa/Lagos" back to "WAT"
        // would reintroduce values the API rejects, and every account in
        // Nigeria shares that one zone.
    }
};
