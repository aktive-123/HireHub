<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Machine-readable feature flags, kept apart from the `features`
        // column above. That column is marketing copy shown on the pricing
        // page and is free text; this one is the contract the API enforces.
        // Splitting them means re-wording a bullet point on a plan card can
        // never accidentally grant or revoke an entitlement.
        Schema::table('plans', function (Blueprint $table): void {
            $table->json('entitlements')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table): void {
            $table->dropColumn('entitlements');
        });
    }
};
