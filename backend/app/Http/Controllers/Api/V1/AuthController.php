<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\UserResource;
use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\Profile;
use App\Models\User;
use App\Support\Address;
use App\Support\LoginThrottle;
use App\Support\Otp;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use RuntimeException;

class AuthController extends ApiController
{
    /**
     * A real bcrypt hash of a value nobody knows, at the same cost factor the
     * application uses. Compared against when the submitted address has no
     * account, so the request does the same amount of key derivation either
     * way. Response latency alone would otherwise enumerate every registered
     * address on the platform.
     */
    private const DUMMY_HASH = '$2y$12$Dnea8SgAN.eg9DJHFeU1bOpYc1yCWdsSGqBbzUHC3wJfaBNefUf6G';

    public function __construct(private readonly Otp $otp) {}

    public function register(Request $request)
    {
        $role = $request->input('role', 'seeker');

        // A client can only ever register as one of these two. Without the
        // allowlist, posting role=admin would mint a privileged account.
        if (! in_array($role, ['seeker', 'employer'], true)) {
            return $this->error('Invalid account type.', 422, ['role' => ['Choose either a job seeker or an employer account.']]);
        }

        $passwordRules = [
            'required',
            'string',
            'confirmed',
            PasswordRule::min((int) config('security.password_min_length'))
                ->max((int) config('security.password_max_length')),
        ];

        if ($role === 'employer') {
            $validated = $request->validate([
                'full_name' => ['required', 'string', 'max:255'],
                'company_name' => ['required', 'string', 'max:255'],
                'work_email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
                'company_size' => ['nullable', 'string', 'max:255'],
                'phone' => Phone::rules(),
                ...Address::rules(streetRequired: true),
                'password' => $passwordRules,
            ]);

            $user = User::create([
                'name' => $validated['full_name'],
                'email' => mb_strtolower($validated['work_email']),
                'password' => $validated['password'],
                // The company's contact number, stored on the account because the
                // person registering is the company contact. Normalised here so
                // the canonical form does not depend on how it was typed.
                'phone' => Phone::normalize($validated['phone']),
            ]);

            // Privilege columns are assigned explicitly, never filled from
            // request input.
            $user->forceFill([
                'role' => UserRole::Employer,
                // Pending, not Active. The account cannot be used until the
                // emailed code is entered; `login` refuses anything that is not
                // Active, so this is the enforcement point rather than a
                // cosmetic flag the client is trusted to honour.
                'status' => AccountStatus::Pending,
                'email_verified_at' => null,
            ])->save();

            $company = Company::create([
                'user_id' => $user->id,
                'slug' => Str::slug($validated['company_name']).'-'.strtolower(Str::random(6)),
                'name' => $validated['company_name'],
                'size' => $validated['company_size'] ?? null,
                'address_line' => $validated['address_line'] ?? null,
                'city' => $validated['city'],
                'state' => $validated['state'],
                // Derived rather than typed, so every site that reads a company
                // location shows the same spelling of the same place.
                'location' => Address::location($validated['city'], $validated['state']),
            ]);

            // New companies start unverified and pending review. A signup can
            // never hand itself the verified badge.
            $company->forceFill(['status' => 'active', 'is_verified' => false])->save();
        } else {
            $validated = $request->validate([
                'first_name' => ['required', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
                'phone' => Phone::rules(),
                // City and state are required because job matching filters on
                // them; the street line is not, because a seeker's address is
                // only ever shown to an employer they apply to.
                ...Address::rules(streetRequired: false),
                'password' => $passwordRules,
            ]);

            $user = User::create([
                'name' => trim($validated['first_name'].' '.$validated['last_name']),
                'email' => mb_strtolower($validated['email']),
                'password' => $validated['password'],
                'phone' => Phone::normalize($validated['phone']),
            ]);

            $user->forceFill([
                'role' => UserRole::Seeker,
                'status' => AccountStatus::Pending,
                'email_verified_at' => null,
            ])->save();

            Profile::create([
                'user_id' => $user->id,
                'address_line' => $validated['address_line'] ?? null,
                'city' => $validated['city'],
                'state' => $validated['state'],
                'location' => Address::location($validated['city'], $validated['state']),
            ]);
        }

        ActivityLog::record($user, 'auth.registered', $user);

        // The code is mailed now, while the plaintext exists nowhere else.
        // No token is issued: until the address is proven, there is nothing to
        // sign in with, so the client is sent to the verification screen
        // instead of a dashboard.
        try {
            $this->otp->issue(
                email: $user->email,
                purpose: Otp::purposeVerify(),
                user: $user,
                ip: $request->ip(),
                name: $user->name,
            );
        } catch (RuntimeException $e) {
            // The account exists but the code could not be sent. Returning 201
            // here would strand the user with an account they can never
            // activate, so the failure is surfaced and the account is removed
            // again — a signup that cannot be completed should not persist.
            $this->rollbackRegistration($user);

            // 429 is right for a throttle, and only for a throttle. A gateway
            // that rejected the send is an outage on our side, and answering 429
            // would tell the client the user is sending too many requests.
            $status = str_starts_with($e->getMessage(), 'delivery_failed') ? 503 : 429;

            return $this->error(
                $this->otpFailureMessage($e),
                $status,
                ['email' => [$this->otpFailureMessage($e)]]
            );
        }

        return $this->success([
            // Explicitly no token: this is the signal the SPA uses to route to
            // /verify-email rather than straight to a dashboard.
            'requires_verification' => true,
            'user' => new UserResource($user),
            'email' => $user->email,
            'otp_expires_in_minutes' => $this->otp->ttlMinutes(),
            'resend_cooldown_seconds' => $this->otp->resendCooldownSeconds(),
        ], 'Account created. Check your inbox for the verification code.', 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = mb_strtolower($validated['email']);
        $throttle = LoginThrottle::make();

        if ($throttle->tooManyAttempts($request, $email)) {
            $retryAfter = $throttle->availableIn($request, $email);

            // Deliberately identical to a wrong password. Distinguishing
            // "locked out" from "wrong password" confirms the account exists.
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
                'data' => null,
                'errors' => ['email' => ['These credentials do not match our records.']],
            ], 401)->header('Retry-After', (string) $retryAfter);
        }

        $user = User::where('email', $email)->first();

        if (! Hash::check($validated['password'], $user?->password ?? self::DUMMY_HASH)) {
            $throttle->hit($request, $email);

            return $this->error('Invalid credentials.', 401, ['email' => ['These credentials do not match our records.']]);
        }

        if ($user->status === AccountStatus::Suspended) {
            $throttle->hit($request, $email);
            ActivityLog::record($user, 'auth.login.blocked', $user, 'warning', $request);

            return $this->error('This account has been suspended. Contact support for help.', 403);
        }

        // Password is right, but the address has never been proven. The code is
        // (re)sent here rather than telling the user to hunt for an old email,
        // because the overwhelmingly common cause is that they never got it.
        //
        // This branch runs only after a successful password comparison, so it
        // cannot be used to probe whether an address is registered: without the
        // password you never reach it.
        if (! $user->hasVerifiedEmail() || $user->status === AccountStatus::Pending) {
            ActivityLog::record($user, 'auth.login.unverified', $user, 'info', $request);

            $this->sendVerificationOtp($request, $user);

            return $this->success([
                'requires_verification' => true,
                'user' => new UserResource($user),
                'email' => $user->email,
                'otp_expires_in_minutes' => $this->otp->ttlMinutes(),
                'resend_cooldown_seconds' => $this->otp->resendCooldownSeconds(),
            ], 'Your email address is not verified yet. We have sent you a new code.', 403);
        }

        $throttle->clear($request, $email);

        ActivityLog::record($user, 'auth.login', $user, 'info', $request);

        $token = $user->issueToken(config('security.token_name'), $this->deviceLabel($request));

        return $this->success([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ], 'Login successful.');
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        $user->currentAccessToken()?->delete();

        ActivityLog::record($user, 'auth.logout', $user, 'info', $request);

        return $this->success(null, 'Logged out.');
    }

    /**
     * Revoke every token for the account, ending all sessions at once. This is
     * what a user reaches for when they believe a device was stolen.
     */
    public function logoutAll(Request $request)
    {
        $user = $request->user();

        $user->revokeTokens();

        ActivityLog::record($user, 'auth.logout_all', $user, 'warning', $request);

        return $this->success(null, 'Signed out of all devices.');
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $role = $user->role->value;

        if ($role === 'seeker') {
            $user->load('profile');
        }

        if ($role === 'employer') {
            $user->load('company');
        }

        return $this->success([
            'user' => new UserResource($user),
            'role' => $role,
            'seeker' => $role === 'seeker' ? [
                'headline' => $user->profile?->headline,
                'location' => $user->profile?->location,
                'summary' => $user->profile?->summary,
                'years_experience' => $user->profile?->years_experience,
            ] : null,
            'employer' => $role === 'employer' && $user->company ? [
                'name' => $user->company->name,
                'slug' => $user->company->slug,
                'logo_text' => $user->company->logo_text,
                'logo_bg' => $user->company->logo_bg,
                'logo_color' => $user->company->logo_color,
                'verified' => $user->company->is_verified,
            ] : null,
        ], 'Authenticated.');
    }

    /**
     * Short, sanitised client hint stored on the token name. Lets a user
     * recognise a session in a security audit without persisting a full user
     * agent string, which is a tracking identifier.
     */
    private function deviceLabel(Request $request): ?string
    {
        $agent = substr((string) $request->userAgent(), 0, 60);

        return $agent === '' ? null : preg_replace('/[^A-Za-z0-9 ._\-\/]/', '', $agent);
    }

    /**
     * Mail a fresh verification code, swallowing rate-limit and cooldown
     * failures.
     *
     * Called from the login path, where the correct credentials are already
     * proven. A "too many requests" result must NOT fail the request: the user
     * still has to be told to go and verify, and a 429 here would read as
     * "wrong password" and send them into a reset loop. The existing code stays
     * valid for its remaining lifetime, so nothing is actually lost.
     */
    private function sendVerificationOtp(Request $request, User $user): void
    {
        try {
            $this->otp->issue(
                email: $user->email,
                purpose: Otp::purposeVerify(),
                user: $user,
                ip: $request->ip(),
                name: $user->name,
            );
        } catch (RuntimeException) {
            // Deliberately ignored — see above.
        }
    }

    /**
     * Turn the Otp service's "reason:seconds" exceptions into wording a person
     * can act on.
     */
    private function otpFailureMessage(RuntimeException $e): string
    {
        [$reason, $value] = array_pad(explode(':', $e->getMessage(), 2), 2, null);

        return match ($reason) {
            'rate_limited' => 'Too many codes requested. Please try again in '.max(1, (int) ceil((int) $value / 60)).' minute(s).',
            'cooldown' => 'Please wait '.max(1, (int) $value).' second(s) before requesting another code.',
            'delivery_failed' => 'We could not email you a code just now. Please try again in a moment.',
            default => 'We could not send the verification code. Please try again.',
        };
    }

    /**
     * Undo a registration whose code could not be delivered.
     *
     * Cascades, because a pending employer account with no company row and a
     * pending seeker with no profile row would both trip the one-to-one
     * constraints the moment the address is re-registered.
     */
    private function rollbackRegistration(User $user): void
    {
        $user->company()->delete();
        $user->profile()->delete();
        $user->delete();
    }
}
