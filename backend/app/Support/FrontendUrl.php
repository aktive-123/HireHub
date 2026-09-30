<?php

namespace App\Support;

use Illuminate\Support\Str;

class FrontendUrl
{
    /**
     * Build an absolute URL into the React app.
     *
     * Centralised so the frontend origin is configured in exactly one place
     * instead of being scattered across controllers, and read from config
     * rather than env() so it survives `config:cache` in production.
     */
    public static function to(string $path = '/'): string
    {
        $base = rtrim((string) config('app.frontend_url'), '/');

        return $base.'/'.ltrim($path, '/');
    }

    /**
     * True when a configured base looks like a real origin, so a malformed
     * FRONTEND_URL cannot turn a redirect into a javascript: or data: URL.
     */
    public static function isValid(): bool
    {
        return Str::startsWith(self::to(), ['http://', 'https://']);
    }
}
