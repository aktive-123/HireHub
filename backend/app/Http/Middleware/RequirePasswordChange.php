<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Confines an account that is holding an admin-issued password.
 *
 * When an admin resets somebody's password the account has to be usable
 * immediately — the alternative is locking a member out of the platform on the
 * strength of one person's mistake — but the temporary password must not become
 * a permanent credential just because nobody thought to rotate it. So the
 * account is admitted, and then denied everything except the means of fixing
 * itself, until the owner picks a password of their own.
 *
 * The enforcement lives here, on the server, rather than in a client-side
 * redirect. A redirect alone would be a suggestion: the token is already valid,
 * so any API call the user or a stale client made would simply succeed. This is
 * the control that makes "must change" mean it.
 *
 * Only three endpoints stay open, and each is required to be:
 *
 *  - the password change itself, which is the only way out of this state
 *  - logout, so signing out is never blocked
 *  - `me`, because the client has to be able to read why it is being refused in
 *    order to show the change-password screen
 */
class RequirePasswordChange
{
    /**
     * Endpoints reachable while a change is owed, matched against the request
     * path with the API prefix already applied.
     */
    private const ALLOWED = [
        'api/v1/auth/password',
        'api/v1/auth/logout',
        'api/v1/auth/logout-all',
        'api/v1/auth/me',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->requiresPasswordChange()) {
            return $next($request);
        }

        if (in_array($request->path(), self::ALLOWED, true)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Choose a new password before continuing.',
            'data' => ['must_change_password' => true],
            'errors' => null,
        ], 403);
    }
}
