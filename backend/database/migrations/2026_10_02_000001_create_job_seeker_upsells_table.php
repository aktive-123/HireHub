<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Job seeker add-on purchases.
 *
 * A separate table from `payments` rather than a new nullable pair of columns
 * on it. `payments` is an employer's money: every row is scoped to a company,
 * carries a plan, and is read back through the company's own receipts. A seeker
 * has no company and buys no plan, so reusing that table would mean either
 * fabricating a company id for the buyer or weakening every employer-scoped
 * query in the codebase with an `OR company_id IS NULL` — a class of bug that
 * shows up as one employer seeing another's invoices.
 *
 * Kept structurally parallel to `payments` (same status enum, same minor-unit
 * amounts, same gateway columns) so the webhook and reporting code reads the
 * same way in both places.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_seeker_upsells', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();

            // The catalogue key, not a description: the label and copy shown to
            // the buyer are rendered from the catalogue, so repricing or
            // renaming a product never rewrites history.
            $table->string('sku');

            $table->unsignedBigInteger('amount');
            $table->char('currency', 3)->default('NGN');

            $table->string('gateway');
            $table->string('reference')->unique();
            $table->string('gateway_reference')->nullable()->unique();
            $table->string('checkout_url')->nullable();

            $table->string('status')->default('pending');
            $table->timestamp('paid_at')->nullable();

            $table->string('error')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_seeker_upsells');
    }
};
