<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Http\Controllers\Api\ApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * The signed-in user's own account settings.
 *
 * Both dashboards used to render a green "settings updated" confirmation
 * without submitting anything, because none of these values had anywhere to
 * persist. Everything the settings screens collect is written here so the
 * confirmation can finally mean something.
 *
 * These endpoints are deliberately self-scoped to `$request->user()`. There is
 * no route parameter, so there is no identifier an attacker could swap to edit
 * somebody else's account.
 */
class SettingsController extends ApiController
{
    /**
     * Preference groups are stored as small key=>bool maps rather than one
     * column per checkbox, so adding a preference does not need a migration.
     * Each group is validated separately in `update`.
     */
    private const PREFERENCE_COLUMNS = [
        'email_preferences',
        'notification_preferences',
        'privacy_preferences',
    ];

    public function show(Request $request)
    {
        return $this->success($this->payload($request->user()));
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'timezone' => ['sometimes', 'string', 'max:64'],
            'two_factor_enabled' => ['sometimes', 'boolean'],
            'email_preferences' => ['sometimes', 'nullable', 'array', 'max:50'],
            'email_preferences.*' => ['boolean'],
            'notification_preferences' => ['sometimes', 'nullable', 'array', 'max:50'],
            'notification_preferences.*' => ['boolean'],
            // The privacy panel is a radio group, so its single value is a
            // choice of visibility rather than a toggle like the other groups.
            // "recruiters" is the job seeker's wording for the same idea as the
            // employer console's "seekers", so both are accepted.
            'privacy_preferences' => ['sometimes', 'nullable', 'array'],
            'privacy_preferences.profile' => ['sometimes', 'nullable', 'string', 'in:public,recruiters,seekers,hidden'],
        ]);

        $user = $request->user();

        // A timezone is used to render times for the user, so an unrecognised
        // zone would silently produce wrong local times. Restrict it to the
        // identifiers PHP itself recognises.
        if (array_key_exists('timezone', $validated)) {
            $validated['timezone'] = $this->assertTimezone($validated['timezone']);
        }

        $changes = array_intersect_key($validated, array_flip([
            'name', 'phone', 'timezone', 'two_factor_enabled',
            ...self::PREFERENCE_COLUMNS,
        ]));

        if ($changes !== []) {
            $user->fill($changes)->save();
        }

        return $this->success($this->payload($user->fresh()), 'Your settings have been updated.');
    }

    /**
     * Change password while already authenticated.
     *
     * Requires the current password, otherwise a stolen bearer token would be
     * enough to lock the real owner out permanently. Other sessions are revoked
     * but the token making this request is kept, so the user is not logged out
     * of the tab they just used.
     */
    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => [
                'required',
                'string',
                'confirmed',
                'different:current_password',
                PasswordRule::min((int) config('security.password_min_length'))
                    ->max((int) config('security.password_max_length')),
            ],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password you entered is incorrect.'],
            ]);
        }

        $user->forceFill(['password' => Hash::make($validated['password'])])->save();

        $currentTokenId = $request->user()->currentAccessToken()?->id;

        $user->tokens()
            ->when($currentTokenId, fn ($query) => $query->where('id', '!=', $currentTokenId))
            ->delete();

        return $this->success(null, 'Password updated. Other devices have been signed out.');
    }

    /**
     * Self-service deactivation.
     *
     * Separate from the admin `users/{user}/status` route on purpose: an admin
     * suspending someone is not the same act as the owner closing their own
     * account, and this one always resolves the caller from the token rather
     * than a route parameter, so it cannot be pointed at another account.
     *
     * Every session is revoked on the way out, otherwise a deactivated account
     * would stay fully usable with a token that was minted before.
     */
    public function deactivate(Request $request)
    {
        $user = $request->user();
        $user->forceFill(['status' => AccountStatus::Suspended])->save();
        $user->revokeTokens();

        return $this->success(null, 'Your account has been deactivated.');
    }

    /**
     * Reactivation. The token is revoked on deactivation, so the caller is
     * signing in again through the normal login route — this exists for the
     * case where an admin reactivated the account and the user wants to clear
     * the local session state.
     */
    public function reactivate(Request $request)
    {
        $user = $request->user();

        if ($user->status !== AccountStatus::Suspended) {
            return $this->success(null, 'Your account is already active.');
        }

        $user->forceFill(['status' => AccountStatus::Active])->save();

        return $this->success(null, 'Your account has been reactivated.');
    }

    /**
     * Normalises a submitted timezone, rejecting anything PHP cannot resolve so
     * a typo cannot be stored and later silently break date rendering.
     */
    private function assertTimezone(?string $timezone): string
    {
        $timezone = $timezone ?: 'UTC';

        if (! in_array($timezone, timezone_identifiers_list(), true)) {
            throw ValidationException::withMessages([
                'timezone' => ['That is not a recognised timezone.'],
            ]);
        }

        return $timezone;
    }

    /**
     * Always returns every group, so the client never has to guard on shape.
     *
     * The cast to object matters: an empty PHP array encodes as `[]`, which
     * would hand the SPA an array where it expects a key=>value map, and the
     * first toggle would then read `undefined` from it.
     */
    private function payload($user): array
    {
        return [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'timezone' => $user->timezone ?? 'UTC',
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
            'email_preferences' => (object) ($user->email_preferences ?? []),
            'notification_preferences' => (object) ($user->notification_preferences ?? []),
            'privacy_preferences' => (object) ($user->privacy_preferences ?? []),
        ];
    }
}
