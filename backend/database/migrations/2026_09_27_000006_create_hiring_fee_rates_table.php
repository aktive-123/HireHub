<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hiring_fee_rates', function (Blueprint $table) {
            $table->id();

            // The senior-most tier, `executive`, is the only one that may also
            // carry a percentage. Storing the percentage on the row rather than
            // in code is what makes the rule editable without a deploy.
            $table->string('level')->index();

            // A rate is global when category is null. Setting it narrows the
            // rate to one job category, which lets an admin charge a different
            // fee for, say, engineering than for admin roles without touching
            // the other levels. Resolution prefers the most specific match.
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();

            // Money in the currency's minor unit (kobo for NGN) so no float
            // rounding is ever possible, matching `payments.amount`.
            $table->unsignedBigInteger('flat_amount')->default(0);
            $table->string('currency', 3)->default('NGN');

            // Basis points (500 = 5%). Integer rather than decimal for the same
            // reason as the amounts above.
            $table->unsignedInteger('percentage_override')->nullable();

            // When both a flat amount and a percentage resolve, the higher one
            // is charged. This is the rule the executive tier is specified to
            // use, and it is a column so an admin can turn it off per rate.
            $table->boolean('use_greater_of')->default(true);

            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            // Deliberately not unique on (level, category_id): a NULL
            // category_id means "global", and MySQL never considers two NULLs
            // equal, so a unique index would happily accept duplicate global
            // rates for the same level. The single-active-rate-per-cell rule is
            // enforced in HiringFeeRateRepository, which is the only writer.
            $table->index(['level', 'category_id']);
            $table->index(['level', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hiring_fee_rates');
    }
};
