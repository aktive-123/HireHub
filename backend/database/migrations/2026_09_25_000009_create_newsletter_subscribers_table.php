<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('newsletter_subscribers', function (Blueprint $table) {
            $table->id();

            // Stored lower-cased so the unique index is the real duplicate
            // guard: without normalising, Foo@x.com and foo@x.com would both
            // pass validation and create two rows for one person.
            $table->string('email')->unique();

            // pending | confirmed | unsubscribed
            $table->string('status')->default('pending');

            // Double opt-in: the address must be proven before it is ever
            // mailed. Cleared once confirmed, because a spent token is a
            // replay risk with no further use.
            $table->string('confirmation_token', 64)->nullable()->unique();
            $table->timestamp('confirmed_at')->nullable();

            // Kept after confirmation so the unsubscribe link in every
            // newsletter keeps working without storing a per-send token.
            $table->string('unsubscribe_token', 64)->nullable()->unique();
            $table->timestamp('unsubscribed_at')->nullable();

            // Which surface collected the signup (e.g. 'footer'). Deliberately
            // no IP column: the rate limiter already keys on IP, so persisting
            // it here would hold personal data nothing reads.
            $table->string('source')->nullable();

            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletter_subscribers');
    }
};
