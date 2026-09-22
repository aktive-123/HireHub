<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    protected function success(mixed $data = null, string $message = 'OK', int $status = 200, array $meta = []): JsonResponse
    {
        return response()->json(array_filter([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta !== [] ? $meta : null,
        ]), $status);
    }

    protected function error(string $message, int $status = 400, mixed $errors = null, mixed $data = null): JsonResponse
    {
        return response()->json(array_filter([
            'success' => false,
            'message' => $message,
            'data' => $data,
            'errors' => $errors,
        ]), $status);
    }
}
