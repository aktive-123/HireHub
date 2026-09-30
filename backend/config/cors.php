<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Methods
    |--------------------------------------------------------------------------
    |
    | Listed explicitly rather than '*'. A wildcard lets a script on an allowed
    | origin issue any verb it likes against the API, including ones a future
    | route might add without anyone revisiting this file.
    |
    */

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins
    |--------------------------------------------------------------------------
    |
    | Driven entirely by the environment. The previous hard-coded list
    | included bare 'http://localhost', which matches any port — so any other
    | project a developer happened to be running on localhost:3000-9999 was an
    | allowed CORS origin for the real API.
    |
    */

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('FRONTEND_URL', 'http://localhost:5173'))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Accept',
        'Accept-Language',
        'Authorization',
        'Content-Type',
        'Origin',
        'X-Requested-With',
        'X-XSRF-TOKEN',
    ],

    /*
    |--------------------------------------------------------------------------
    | Exposed Headers
    |--------------------------------------------------------------------------
    |
    | A browser cannot read a header from a cross-origin response unless it is
    | exposed here. Without this the client cannot honour Retry-After, so a
    | throttled user has no idea how long to wait before retrying.
    |
    */

    'exposed_headers' => ['Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],

    /*
    |--------------------------------------------------------------------------
    | Max Age
    |--------------------------------------------------------------------------
    |
    | Browsers may cache the preflight result. One hour keeps the round trip
    | off every request while still picking up an origin change within a
    | minute or so of a deploy. Zero means a preflight on literally every
    | single request.
    |
    */

    'max_age' => (int) env('CORS_MAX_AGE', 3600),

    'supports_credentials' => true,

];
