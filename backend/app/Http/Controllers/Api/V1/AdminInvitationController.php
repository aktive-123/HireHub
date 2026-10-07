<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\UserResource;
use App\Mail\AdminInviteMail;
use App\Models\ActivityLog;
use App\Models\AdminInvitation;
use App\Models\User;
use App\Support\BrevoMailer;
use App\Support\FrontendUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Throwable;

/**
 * Invite-only admin creation.
 *
 * There are three ways a privileged account can come into being, and this
 * controller owns the third:
 *
 *   1. The seeder / CreateAdminCommand — bootstrap, run once per environment
 *      by somebody with shell access.
 *   2. Never via self-registration — AuthController's allowlist refuses any
 *      role but seeker or employer, and that is not negotiable.
 *   3. Here — an existing administrator invites an address, the emailed
 *      single-use link proves control of it, and the account is created in
 *      two auditable steps rather than one privileged POST.
 *
 * The public endpoints (preview, accept) take a raw token in the path. The
 * row is found by hashing it, so the database never holds the credential, and
 * unknown, spent and expired tokens are answered with the shape of failure
 * rather than the reason, so a link cannot be used as an oracle for which
 * invitations exist.
 */
class AdminInvitationController extends ApiController
{
    /**
     * Outstanding invitations, newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $invitations = AdminInvitation::query()
            ->pending()
            ->with('invitedBy:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (AdminInvitation $invitation): array => $this->shape($invitation))
            ->values();

        return $this->success($invitations, 'OK');
    }

    /**
     * Issue an invitation: one live token per address, emailed to it.
     *
     * Re-inviting the same address deletes the outstanding row first, so the
     * old link dies when the new one is minted. Two live invitations for one
     * address would mean an admin who thought they revoked access had not.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = Str::lower(trim($validated['email']));

        // The address already has an account: there is nothing to invite, and
        // saying so here is safe because the caller is a signed-in admin.
        if (User::where('email', $email)->exists()) {
            return $this->error(
                'An account with that email already exists.',
                422,
                ['email' => ['An account with that email already exists.']],
            );
        }

        $admin = $request->user();
        $rawToken = AdminInvitation::generateToken();

        $invitation = DB::transaction(function () use ($email, $rawToken, $admin): AdminInvitation {
            AdminInvitation::where('email', $email)
                ->whereNull('accepted_at')
                ->delete();

            $invitation = new AdminInvitation([
                'email' => $email,
                'token_hash' => hash('sha256', $rawToken),
                'invited_by' => $admin->id,
                'expires_at' => now()->addDays(AdminInvitation::TTL_DAYS),
            ]);
            $invitation->save();

            return $invitation;
        });

        $mailed = $this->sendInvite($invitation, $rawToken, $admin);

        ActivityLog::record($admin, 'admin.invitation.sent', null, 'info', $request)
            ->update(['target_name' => $email]);

        return $this->success(
            [
                'invitation' => $this->shape($invitation),
                // Returned once, on creation only. The raw token is never
                // recoverable afterwards — the row keeps just its hash — so
                // this is the one moment the console can offer a copyable
                // link for mail that failed to send.
                'invite_url' => FrontendUrl::to('/admin-invite/'.$rawToken),
                'notification_sent' => $mailed,
            ],
            $mailed
                ? 'Invitation sent. The link is valid for '.AdminInvitation::TTL_DAYS.' days.'
                : 'Invitation created, but the email could not be sent. Copy the link and share it directly.',
            201,
        );
    }

    /**
     * Cancel an invitation before it is used. The row goes away entirely:
     * a spent or revoked token must find nothing at all, not a tombstone it
     * could be fingerprinted against.
     */
    public function destroy(Request $request, AdminInvitation $invitation): JsonResponse
    {
        if ($invitation->accepted_at !== null) {
            return $this->error('That invitation has already been used.', 410);
        }

        $email = $invitation->email;
        $invitation->delete();

        ActivityLog::record($request->user(), 'admin.invitation.revoked', null, 'warning', $request)
            ->update(['target_name' => $email]);

        return $this->success(null, 'Invitation revoked. The link no longer works.');
    }

    /**
     * What the invitee sees on opening the link: just enough to confirm the
     * address it was sent to. Token possession is the authorisation — there
     * is no session to check against, because the account does not exist yet.
     */
    public function preview(string $token): JsonResponse
    {
        $invitation = AdminInvitation::findByToken($token);

        if (! $invitation) {
            return $this->error('That invitation link is invalid or has expired.', 404);
        }

        if ($invitation->accepted_at !== null) {
            return $this->error('That invitation has already been used.', 410);
        }

        if ($invitation->expires_at->isPast()) {
            return $this->error('That invitation link has expired.', 410);
        }

        return $this->success([
            'email' => $invitation->email,
            'inviter' => $invitation->invitedBy?->name,
            'expires_label' => $invitation->expires_at->format('M j, Y \a\t g:i A'),
        ], 'OK');
    }

    /**
     * Finish the job: turn the token into a real admin account and a session.
     *
     * Everything privileged is assigned explicitly — role, status, verified
     * address — exactly as register() does for its two public roles, because
     * the one thing this endpoint must never do is fill a privilege column
     * from request input.
     */
    public function accept(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => [
                'required',
                'string',
                'confirmed',
                PasswordRule::min((int) config('security.password_min_length'))
                    ->max((int) config('security.password_max_length')),
            ],
        ]);

        $invitation = AdminInvitation::findByToken($token);

        if (! $invitation) {
            return $this->error('That invitation link is invalid or has expired.', 404);
        }

        if ($invitation->accepted_at !== null) {
            return $this->error('That invitation has already been used.', 410);
        }

        if ($invitation->expires_at->isPast()) {
            return $this->error('That invitation link has expired.', 410);
        }

        // The address may have gained an account some other way since the
        // invite went out. Duplicating it would trip the unique index anyway;
        // failing with a sign-in pointer is the honest answer either way.
        if (User::where('email', $invitation->email)->exists()) {
            return $this->error(
                'An account with that email already exists. Sign in instead.',
                422,
                ['email' => ['An account with that email already exists.']],
            );
        }

        $user = DB::transaction(function () use ($invitation, $validated): User {
            // Claim the invitation first, guarded by "still unclaimed", so two
            // simultaneous submissions of the same link cannot both win: the
            // second update matches no rows and the whole attempt aborts.
            $claimed = AdminInvitation::whereKey($invitation->id)
                ->whereNull('accepted_at')
                ->update(['accepted_at' => now()]);

            if ($claimed === 0) {
                abort(410, 'That invitation has already been used.');
            }

            $user = User::create([
                'name' => $validated['name'],
                'email' => $invitation->email,
                'password' => $validated['password'],
            ]);

            $user->forceFill([
                'role' => UserRole::Admin,
                // Active and verified: the emailed link already proved control
                // of the address, so there is no pending OTP left to wait for,
                // and `login` is the enforcement point for standing.
                'status' => AccountStatus::Active,
                'email_verified_at' => now(),
            ])->save();

            return $user;
        });

        $plainTextToken = $user->issueToken('admin-invite');

        ActivityLog::record($user, 'admin.invitation.accepted', $user, 'info', $request);

        return $this->success(
            [
                'token' => $plainTextToken,
                'user' => new UserResource($user),
            ],
            'Welcome to the HireHub admin console.',
        );
    }

    /**
     * Tell the invitee, in-request, where the link is.
     *
     * Best-effort by contract: a mail provider being down must not fail an
     * invitation that already exists, so delivery is reported as
     * `notification_sent` rather than thrown, and the raw token rides along
     * in the response exactly once so the console can hand it over manually.
     * BrevoMailer prefers the HTTPS API (the transport signup and reset codes
     * already use) and falls back to the mailer when no key is configured.
     */
    private function sendInvite(AdminInvitation $invitation, string $rawToken, User $admin): bool
    {
        if (! config('mail.enabled', false)) {
            return false;
        }

        try {
            BrevoMailer::send(
                new AdminInviteMail(
                    recipientLabel: $invitation->email,
                    inviterName: $admin->name,
                    inviteUrl: FrontendUrl::to('/admin-invite/'.$rawToken),
                    expiresLabel: $invitation->expires_at->format('M j, Y \a\t g:i A'),
                    appName: (string) config('app.name'),
                ),
                $invitation->email,
            );

            return true;
        } catch (Throwable $e) {
            Log::channel('stderr')->error('Admin invitation could not be delivered.', [
                'event' => 'admin.invitation.send_failed',
                'invitation_id' => $invitation->id,
                'failure_type' => $e::class,
            ]);

            return false;
        }
    }

    /**
     * Console shape for a pending invitation. Nothing token-shaped: the hash
     * stays server-side and the raw value was never stored.
     */
    private function shape(AdminInvitation $invitation): array
    {
        return [
            'id' => $invitation->id,
            'email' => $invitation->email,
            'invited_by' => $invitation->invitedBy?->name,
            'invited' => $invitation->created_at->format('M j, Y'),
            'expires' => $invitation->expires_at->format('M j, Y'),
            'expires_at' => $invitation->expires_at->toIso8601String(),
        ];
    }
}
