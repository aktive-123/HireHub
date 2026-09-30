<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The moment an application last changed pipeline stage. `updated_at`
        // cannot stand in for it: an edit to a cover letter or a CV re-upload
        // also bumps that column, which would make time-to-hire meaningless.
        // Recorded by the model on every status transition so employer and
        // admin paths cannot drift apart.
        Schema::table('applications', function (Blueprint $table): void {
            $table->timestamp('status_changed_at')->nullable()->after('status');
            $table->index(['status', 'status_changed_at']);
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table): void {
            $table->dropIndex(['status', 'status_changed_at']);
            $table->dropColumn('status_changed_at');
        });
    }
};
