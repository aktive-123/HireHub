<?php

namespace App\Support;

use App\Billing\Exceptions\PlanFeatureRequired;
use App\Billing\Exceptions\PlanLimitReached;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

/**
 * Maps framework exceptions onto the API's single error envelope.
 *
 * Without this, Laravel renders HTML error pages (or a 302 redirect) for
 * requests that do not send `Accept: application/json`, and validation failures
 * come back in a different shape from every other error the API returns. One
 * renderer keeps the contract consistent for the React client.
 */
final class ApiExceptionRenderer
{
    /**
     * Never surface internal details (stack traces, driver errors, SQL) to
     * clients. Unmapped exceptions collapse to a generic 500.
     */
    public static function render(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return null;
        }

        // A developer still needs the real trace locally, but `APP_DEBUG=true`
        // left on in a deployed environment is a routine mistake that hands
        // every visitor a stack trace and connection strings. Both switches
        // must be on before anything internal is disclosed.
        if (app()->hasDebugModeEnabled() && config('security.expose_debug')) {
            return null;
        }

        return match (true) {
            // A spent plan allowance. Carries the live usage block so the
            // upgrade modal quotes the employer's real numbers.
            $e instanceof PlanLimitReached => self::make(
                $e->getMessage(),
                403,
                code: 'plan_limit_reached',
                data: $e->context(),
            ),

            // A capability the current plan does not grant.
            $e instanceof PlanFeatureRequired => self::make(
                $e->getMessage(),
                403,
                code: 'plan_upgrade_required',
                data: $e->context(),
            ),

            $e instanceof ValidationException => self::make(
                'The given data was invalid.',
                422,
                $e->errors(),
            ),

            $e instanceof AuthenticationException => self::make(
                'Unauthenticated.',
                401,
            ),

            $e instanceof AuthorizationException => self::make(
                $e->getMessage() !== '' && $e->getMessage() !== 'This action is unauthorized.'
                    ? $e->getMessage()
                    : 'You do not have permission to access this resource.',
                403,
            ),

            $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => self::make(
                'Resource not found.',
                404,
            ),

            $e instanceof TooManyRequestsHttpException => self::make(
                'Too many requests. Please slow down and try again shortly.',
                429,
                headers: $e->getHeaders(),
            ),

            $e instanceof HttpExceptionInterface => self::make(
                $e->getMessage() !== '' ? $e->getMessage() : 'Request could not be completed.',
                $e->getStatusCode(),
                headers: $e->getHeaders(),
            ),

            default => self::make(
                'Something went wrong. Please try again.',
                500,
            ),
        };
    }

    /**
     * @param  array<string, string|string[]>  $headers
     */
    private static function make(
        string $message,
        int $status,
        mixed $errors = null,
        array $headers = [],
        ?string $code = null,
        ?array $data = null,
    ): JsonResponse {
        $response = response()->json(array_filter([
            'success' => false,
            'message' => $message,
            // A stable, machine-readable discriminator. The client branches on
            // this rather than on prose or a bare status, so copy can be
            // reworded without breaking behaviour. `plan_limit_reached` is what
            // opens the upgrade modal.
            'error_code' => $code,
            'data' => $data,
            'errors' => $errors,
        ], fn ($value) => $value !== null), $status);

        // Headers the exception carried are part of the contract, not decoration.
        // A 429 without `Retry-After` leaves the client guessing how long to wait,
        // which is the one thing the rate limiter exists to tell it.
        foreach ($headers as $name => $value) {
            $response->headers->set($name, $value, true);
        }

        return $response;
    }
}
