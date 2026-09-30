<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->string('cv_path')->nullable()->after('portfolio');
            $table->string('cv_name')->nullable()->after('cv_path');
            $table->timestamp('cv_updated_at')->nullable()->after('cv_name');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['cv_path', 'cv_name', 'cv_updated_at']);
        });
    }
};
