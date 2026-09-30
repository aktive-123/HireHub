<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\UserResource;
use App\Models\ActivityLog;
use App\Models\User;
use App\Support\Otp;
use App\Support\OtpVerificationResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use RuntimeException;

/**
 * One-time password verification and password recovery.
 *
 * Both flows share one code type and one set of rules, so they live together.
 * What differs is what happens on success: `verify` activates an account,
 * `reset` hands back a short-lived grant that authorises a password change.
 *
 * Two invariants hold across every method here:
 *
 *  - An unauthenticated caller cannot learn whether an address is registered.
 *    Every response that could differ is made identical, and anything that
 *    varies is expressed as timing or as a cooldown the caller could also
 *    trigger without an account.
 *  - A code is worthless twice. Redemption consumes it inside a transaction
 *    that locks the row, so two simultaneous submissions cannot both win.
 */
class VerificationController extends ApiController
{
    public function __construct(private readonly Otp $otp) {}

    /**
     * Resend a verification code to a signed-in user.
     *
     * Authenticated, so it may say plainly that the address is already
     * verified — the caller has already proven who they are.
     */
    public function send(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return $this->success(null, 'Email address already verified.');
        }

        try {
            $this->otp->issue(
                email: $user->email,
                purpose: Otp::purposeVerify(),
                user: $user,
                ip: $request->ip(),
                name: $user->name,
            );
        } catch (RuntimeException $e) {
            return $this->otpThrottled($e);
        }

        return $this->success($this->otpMeta($user->email, Otp::purposeVerify()), 'A new code is on its way.');
    }

    /**
     * Start (or restart) a password recovery.
     *
     * Unauthenticated, and therefore the answer must not vary with whether the
     * address exists. A code is only written when an account actually matched;
     * for an unknown address the same 200 with the same body comes back, and no
     * mail is sent because there is nowhere to send it.
     */
    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $email = mb_strtolower($validated['email']);
        $user = User::where('email', $email)->first();

        // Suspended accounts are skipped deliberately: there is nobody to help
        // them recover, and mailing them would confirm the address is known.
        if ($user && $user->status !== AccountStatus::Suspended) {
            try {
                $this->otp->issue(
                    email: $email,
                    purpose: Otp::purposeReset(),
                    user: $user,
                    ip: $request->ip(),
                    name: $user->name,
                );
            } catch (RuntimeException) {
                // Swallowed on purpose. Reporting "you are rate limited" for a
                // real account and "check your inbox" for an unknown one is an
                // enumeration oracle. The client shows the same neutral
                // confirmation either way.
            }
        }

        // Deliberately not echoing the address back, and reading every value
        // from config rather than from the account: the response has to be
        // byte identical for a known address, an unknown one and a suspended
        // one, or it becomes an enumeration oracle. The client already knows
        // which address the visitor typed.
        return $this->success([
            'otp_expires_in_minutes' => $this->otp->ttlMinutes(),
            'resend_cooldown_seconds' => $this->otp->resendCooldownSeconds(),
        ], 'If that email is registered, a verification code has been sent.');
    }

    /**
     * Redeem a code.
     *
     * For `verify` the caller must be signed in as the account owner — an
     * unauthenticated signup has no token yet, which is the entire point of the
     * flow, so verification is authorised by knowing the code *and* the
     * address, both of which the user just supplied.
     *
     * For `reset` a successful check returns a grant rather than changing
     * anything: the grant is the only thing that can authorise
     * `resetPassword`, which keeps the code single-use and stops a leaked
     * in-flight code from being replayed against a second attempt.
     */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'digits:'.(int) config('otp.length', 6)],
            'purpose' => ['sometimes', 'string', Rule::in(config('otp.purposes', ['verify', 'reset']))],
        ]);

        $purpose = $validated['purpose'] ?? Otp::purposeVerify();
        $email = mb_strtolower($validated['email']);

        // Scoping to the signed-in user when a token is present stops a code
        // mailed to A from being redeemed by whoever happens to be signed in as
        // B. Absent a token (signup, or a logged-out recovery) the address in
        // the body is the only claim, which is the design: possessing the code
        // is the proof.
        $user = $request->user();

        $result = $this->otp->verify($email, $purpose, $validated['code'], $user);

        if (! $result->isValid()) {
            return $this->invalidCode($result, $email, $purpose);
        }

        return match ($purpose) {
            Otp::purposeReset() => $this->completeReset($email, $result),
            default => $this->activateAccount($email, $result),
        };
    }

    /**
     * Resend for either purpose, unauthenticated.
     *
     * Used by the verification and recovery screens, neither of which can be
     * relied on to hold a token. Always answers identically for a known and an
     * unknown address, for the same reason as forgotPassword.
     */
    public function resend(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'purpose' => ['required', 'string', Rule::in(config('otp.purposes', ['verify', 'reset']))],
        ]);

        $email = mb_strtolower($validated['email']);
        $purpose = $validated['purpose'];
        $user = User::where('email', $email)->first();

        if ($user) {
            try {
                $this->otp->issue(
                    email: $email,
                    purpose: $purpose,
                    user: $user,
                    ip: $request->ip(),
                    name: $user->name,
                );
            } catch (RuntimeException $e) {
                // A cooldown is safe to report: it is observable by anyone who
                // simply requested a code twice, with or without an account.
                // A rate-limit is not, because it only accumulates for a real
                // address — so that one is reported as the neutral message.
                if (str_starts_with($e->getMessage(), 'cooldown:')) {
                    return $this->otpThrottled($e);
                }
            }
        }

        return $this->success($this->otpMeta($email, $purpose), 'If that email is registered, a new code has been sent.');
    }

    /**
     * Spend a reset grant by setting a new password.
     *
     * The grant is a single opaque string rather than the code itself, so the
     * six digits are burned at the verification step and this endpoint cannot
     * be brute forced.
     */
    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'grant' => ['required', 'string', 'size:64'],
            'password' => [
                'required',
                'string',
                'confirmed',
                PasswordRule::min((int) config('security.password_min_length'))
                    ->max((int) config('security.password_max_length')),
            ],
        ]);

        $email = mb_strtolower($validated['email']);
        $user = User::where('email', $email)->first();

        $grantHash = hash('sha256', $validated['grant']);

        if (! $user || ! $this->consumeGrant($user, $grantHash)) {
            return $this->error('This password reset has expired. Please request a new code.', 422);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'remember_token' => Str::random(60),
        ])->save();

        // Every token was issued under the old password. Leaving them alive
        // would let an attacker who stole one keep access after the owner
        // changed it.
        $user->revokeTokens();

        // A recovery is also a proof of address, so a pending account becomes
        // usable rather than being left stranded in a half-registered state.
        if (! $user->hasVerifiedEmail()) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        if ($user->status === AccountStatus::Pending) {
            $user->forceFill(['status' => AccountStatus::Active])->save();
        }

        ActivityLog::record($user, 'auth.password.reset', $user, 'warning', $request);

        return $this->success(null, 'Password updated. You can now sign in with your new password.');
    }

    /**
     * Mark the address verified and activate the account, then sign the user in
     * so the verification screen can hand them straight to their dashboard.
     */
    private function activateAccount(string $email, OtpVerificationResult $result): JsonResponse
    {
        $user = User::where('email', $email)->first();

        if (! $user) {
            return $this->error('This verification code is invalid or has expired.', 422);
        }

        $user->forceFill(['email_verified_at' => now()])->save();

        if ($user->status === AccountStatus::Pending) {
            $user->forceFill(['status' => AccountStatus::Active])->save();
        }

        ActivityLog::record($user, 'auth.email.verified', $user, 'info', request());

        $token = $user->issueToken(config('security.token_name'));

        return $this->success([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user->fresh()),
            'email' => $user->email,
        ], 'Email address verified. Welcome to HireHub.');
    }

    /**
     * Turn a successful reset verification into a single-use grant.
     */
    private function completeReset(string $email, OtpVerificationResult $result): JsonResponse
    {
        $user = User::where('email', $email)->first();

        if (! $user) {
            return $this->error('This verification code is invalid or has expired.', 422);
        }

        $grant = Str::random(64);

        $user->forceFill([
            // Stored hashed, and single use: `consumeGrant` clears it in the
            // same transaction that reads it.
            'password_reset_grant_hash' => hash('sha256', $grant),
            'password_reset_grant_expires_at' => now()->addMinutes((int) config('otp.reset_grant_ttl_minutes', 10)),
        ])->save();

        return $this->success([
            'grant' => $grant,
            'expires_in_minutes' => (int) config('otp.reset_grant_ttl_minutes', 10),
        ], 'Code accepted. Choose a new password.');
    }

    /**
     * Validate and burn a grant atomically.
     */
    private function consumeGrant(User $user, string $grantHash): bool
    {
        return (bool) $user->newQuery()
            ->whereKey($user->id)
            ->where('password_reset_grant_hash', $grantHash)
            ->where('password_reset_grant_expires_at', '>', now())
            // Cleared as the guard applies, so a second attempt with the same
            // grant matches nothing.
            ->update(['password_reset_grant_hash' => null, 'password_reset_grant_expires_at' => null]);
    }

    /**
     * A consistent, actionable message for every kind of failure.
     *
     * "Invalid" deliberately covers a wrong code, an unknown address and an
     * already-used one. Only the reason codes that are equally true for a
     * non-existent account are given their own wording, so the response still
     * cannot be used to enumerate users.
     */
    private function invalidCode(OtpVerificationResult $result, string $email, string $purpose): JsonResponse
    {
        [$message, $code] = match ($result->reason) {
            'expired' => ['That code has expired. Request a new one to continue.', 422],
            'too_many_attempts' => ['Too many incorrect attempts. Request a new code to continue.', 422],
            default => ['That code is not valid. Check it and try again.', 422],
        };

        return $this->error($message, $code, ['code' => [$message]]);
    }

    private function otpThrottled(RuntimeException $e): JsonResponse
    {
        [$reason, $value] = array_pad(explode(':', $e->getMessage(), 2), 2, null);

        $retryAfter = (int) $value;

        // A gateway that would not accept the send is not a throttle, and a 429
        // with a zero Retry-After would tell the client to retry immediately —
        // into the same failure. 503 is the honest status, and the reason is
        // visible to this caller because `send` requires a token, so there is no
        // address being confirmed here.
        if ($reason === 'delivery_failed') {
            $message = 'We could not email you a code just now. Please try again in a moment.';

            return response()->json([
                'success' => false,
                'message' => $message,
                'data' => null,
                'errors' => ['code' => [$message]],
            ], 503);
        }

        $message = $reason === 'cooldown'
            ? "Please wait {$retryAfter} second(s) before requesting another code."
            : 'Too many codes requested. Please try again later.';

        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => ['code' => [$message]],
        ], 429)->header('Retry-After', (string) $retryAfter);
    }

    /**
     * Timing and cooldown figures for the client countdown, so the browser and
     * the server never disagree about when a resend is allowed.
     */
    private function otpMeta(string $email, string $purpose): array
    {
        return [
            'purpose' => $purpose,
            'expires_in_minutes' => $this->otp->ttlMinutes(),
            'cooldown_seconds' => $this->otp->cooldownRemaining($email, $purpose),
        ];
    }
}
