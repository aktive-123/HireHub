<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Invite-only admin creation, the database half.
 *
 * A platform role that can suspend accounts, reset passwords and read every
 * applicant's PII must never be creatable by the public signup form, and the
 * self-registration allowlist in AuthController already refuses the admin role.
 * The remaining gap is the legitimate case — an existing administrator adding a
 * colleague — which this table turns into a two-step, auditable act: the admin
 * issues a single-use token, and only whoever holds the emailed link can finish
 * creating the account.
 *
 * Design notes worth keeping:
 *
 *   token_hash  The raw token lives only in the emailed link. Storing its
 *               sha256 means a database dump (or a backup of a backup) cannot
 *               be replayed as a live invitation, the same reasoning that
 *               protects password hashes.
 *   accepted_at Once set, the token is spent. The column doubles as the audit
 *               of *when* the invitee claimed the address.
 *   expires_at  Links die. An invitation that sits in a mailbox for months is
 *               a standing invitation for anyone who compromises that mailbox.
 *   invited_by  Who vouched for this account, cascade-deleted because an
 *               invitation from somebody who no longer exists should not
 *               outlive them.
 *
 * Deliberately no unique index on email: MySQL cannot index a partial
 * predicate ("only rows where accepted_at is null"), so uniqueness of the live
 * invitation is enforced in the controller by deleting any outstanding row for
 * the address before issuing a new one — which is also the behaviour we want,
 * since re-inviting must invalidate the old link rather than sit beside it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_invitations', function (Blueprint $table): void {
            $table->id();
            // Normalised to lower case on write; indexed because the "is this
            // address already invited?" check and the replace-outstanding-row
            // step both look it up.
            $table->string('email')->index();
            $table->char('token_hash', 64)->unique();
            $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_invitations');
    }
};
