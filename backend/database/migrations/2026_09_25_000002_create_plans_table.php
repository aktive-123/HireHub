<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('tagline')->nullable();

            // Minor units (kobo/cents) so no rounding error is ever introduced
            // by float maths on a monetary column.
            $table->unsignedBigInteger('price')->default(0);
            $table->string('currency', 3)->default('NGN');
            $table->string('billing_period')->default('monthly');

            $table->unsignedInteger('job_post_limit')->default(0);
            $table->unsignedInteger('featured_job_limit')->default(0);
            $table->unsignedInteger('cv_view_limit')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->json('features')->nullable();

            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
