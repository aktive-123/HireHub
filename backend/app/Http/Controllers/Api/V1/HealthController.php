<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use Illuminate\Http\JsonResponse;

class HealthController extends ApiController
{
    public function __invoke(): JsonResponse
    {
        return $this->success([
            'status' => 'ok',
            'service' => 'hirehub-api',
            'environment' => app()->environment(),
            'time' => now()->toIso8601String(),
        ], 'Service is up.');
    }
}
