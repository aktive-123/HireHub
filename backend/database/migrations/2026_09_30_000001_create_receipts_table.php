<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table): void {
            $table->id();

            // Both real money flows already converge on `payments`: a plan
            // subscription is a payment row, and a hiring fee carries a
            // `payment_id` pointing at one. Keying receipts off that single
            // table means one receipt implementation covers every charge the
            // platform can take, instead of one per flow that has to be
            // re-implemented and can drift.
            //
            // Unique: one receipt per transaction. A duplicate webhook or a
            // re-run confirm would otherwise mint a second "receipt #10042",
            // which is the kind of thing that shows up in an audit.
            $table->foreignId('payment_id')->unique()->constrained()->cascadeOnDelete();

            // Human-facing receipt number, printed on the document and quoted
            // in support conversations. Derived from the row id at issue time
            // so it is stable and never reused, unlike the payment reference
            // (which is the gateway's).
            $table->string('number')->unique();

            // Everything below is a snapshot taken when the receipt was issued,
            // not a live join. A receipt is a statement about a past
            // transaction: if the plan is renamed, the fee rate is deleted or
            // the payer changes their email tomorrow, the PDF a customer
            // downloaded last year must still say what they were actually
            // charged for.
            $table->string('payer_name');
            $table->string('payer_email');
            $table->string('item_description');
            $table->unsignedBigInteger('amount');
            $table->string('currency', 3);

            // The gateway's own transaction id, kept verbatim. This is what a
            // customer quotes to Paystack support, and it must not be
            // reformatted or truncated.
            $table->string('gateway_reference')->nullable();
            $table->string('gateway');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            // Admin reporting reads receipts by time range, and the admin
            // payments table sorts newest-first within a status filter.
            $table->index(['gateway', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};
