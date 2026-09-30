<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->foreignId('application_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('seeker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('scheduled_at')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(30);
            $table->string('mode')->default('video');
            $table->string('link')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamps();

            $table->index(['company_id', 'status', 'scheduled_at']);
            $table->index(['seeker_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interviews');
    }
};
