<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    protected function success(mixed $data = null, string $message = 'OK', int $status = 200, array $meta = []): JsonResponse
    {
        // Nulls are dropped so an empty `data` or `meta` does not appear as a
        // key at all. Everything else is kept: a bare `array_filter` would also
        // drop `false`, which silently removed `success` from every error body
        // built here and left the client guessing from the status code alone.
        return response()->json(array_filter([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta !== [] ? $meta : null,
        ], static fn (mixed $value): bool => $value !== null), $status);
    }

    /**
     * @param  string|null  $code  A stable, machine-readable discriminator. Clients
     *                             branch on this rather than on prose, so copy can
     *                             be reworded without breaking behaviour. Same key
     *                             ApiExceptionRenderer emits, so a refusal from a
     *                             controller and one from an exception are shaped
     *                             identically.
     */
    protected function error(string $message, int $status = 400, mixed $errors = null, mixed $data = null, ?string $code = null): JsonResponse
    {
        return response()->json(array_filter([
            'success' => false,
            'message' => $message,
            'error_code' => $code,
            'data' => $data,
            'errors' => $errors,
        ], static fn (mixed $value): bool => $value !== null), $status);
    }
}
