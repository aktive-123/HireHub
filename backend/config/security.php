<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Password policy
    |--------------------------------------------------------------------------
    |
    | The minimum is a single knob so the API, the React forms and any future
    | console command can never drift apart. 72 is bcrypt's hard byte limit —
    | anything past it is silently ignored, so accepting longer input would
    | quietly weaken the password.
    |
    */

    'password_min_length' => (int) env('SECURITY_PASSWORD_MIN_LENGTH', 8),

    'password_max_length' => (int) env('SECURITY_PASSWORD_MAX_LENGTH', 72),

    /*
    |--------------------------------------------------------------------------
    | Failed login lockout
    |--------------------------------------------------------------------------
    |
    | Counted per (email + IP) pair rather than per IP: a per-IP counter lets a
    | botnet spread one spray across thousands of hosts, while a per-email
    | counter alone lets an attacker lock a real user out. The pair gives both
    | limits at once.
    |
    */

    'lockout_attempts' => (int) env('SECURITY_LOCKOUT_ATTEMPTS', 5),

    'lockout_decay' => (int) env('SECURITY_LOCKOUT_DECAY', 900),

    /*
    |--------------------------------------------------------------------------
    | API tokens
    |--------------------------------------------------------------------------
    |
    | Tokens that never expire are permanent credentials sitting in a browser
    | or a leaked log. Sixty days forces a re-login, and changing a password
    | revokes every outstanding token in the same request.
    |
    */

    'token_ttl' => (int) env('SECURITY_TOKEN_TTL', 5184000),

    'token_name' => env('SECURITY_TOKEN_NAME', 'auth'),

    /*
    |--------------------------------------------------------------------------
    | Uploads
    |--------------------------------------------------------------------------
    |
    | Extensions alone are attacker controlled, so the allowlist is checked
    | twice: once against the real detected MIME type of the bytes on disk and
    | once against the extension. Both must be on the list.
    |
    */

    'uploads' => [
        'cv_max_kb' => (int) env('SECURITY_CV_MAX_KB', 5120),

        'cv_extensions' => ['pdf', 'doc', 'docx'],

        /*
         * Real office formats are genuinely inconsistent: a .doc may sniff as
         * MS Word, as generic OLE storage, or as CDFV2, and a .docx is a zip
         * container that often reports only as `application/zip`. Rejecting
         * those would be a functional bug, not extra safety.
         *
         * The types that actually matter are the ones a browser will happily
         * render as a document on this origin — text/html, image/svg+xml,
         * application/xhtml+xml — plus anything executable. None of those are
         * on this list, which is the point of the allowlist. The file is
         * additionally stored outside the web root and served only as
         * `application/octet-stream` with `nosniff`.
         */
        'cv_mimetypes' => [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-word.document.macroenabled.12',
            'application/x-ole-storage',
            'application/cdfv2',
            'application/zip',
            'application/x-zip-compressed',
            'application/octet-stream',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Security response headers
    |--------------------------------------------------------------------------
    |
    | Applied to every response. HSTS is only safe over TLS, so it is emitted
    | when the request is already HTTPS or when the app is not in local
    | development — otherwise the browser would pin localhost and break HMR.
    |
    */

    'hsts_max_age' => (int) env('SECURITY_HSTS_MAX_AGE', 31536000),

    'permissions_policy' => 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',

    'referrer_policy' => 'strict-origin-when-cross-origin',

    /*
    |--------------------------------------------------------------------------
    | Content Security Policy
    |--------------------------------------------------------------------------
    |
    | Only applied to first-party HTML. API responses are JSON and never
    | rendered, and the React bundle is served by Vite from its own origin, so
    | 'self' plus the dev server is enough to keep injected script out.
    |
    */

    'csp' => [
        'default-src' => ["'self'"],
        'base-uri' => ["'self'"],
        'object-src' => ["'none'"],
        'frame-ancestors' => ["'none'"],
        'form-action' => ["'self'"],
        'img-src' => ["'self'", 'data:', 'https:'],
        'font-src' => ["'self'", 'data:'],
        'style-src' => ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'script-src' => ["'self'", 'https://js.stripe.com', 'https://checkout.paystack.com'],
        'frame-src' => ["'self'", 'https://js.stripe.com', 'https://checkout.paystack.com', 'https://hooks.stripe.com'],
        'connect-src' => ["'self'", 'https://api.stripe.com', 'https://api.paystack.co'],
        'upgrade-insecure-requests' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Reverse proxy / trusted host trust
    |--------------------------------------------------------------------------
    |
    | Behind a load balancer the real client IP and scheme arrive in
    | X-Forwarded-*, and every rate limiter and the HSTS decision depend on
    | them. Trusting that header from any source would let a caller forge its
    | own IP and walk straight through the limiters, so only the addresses of
    | the actual proxy are trusted. '*' is acceptable only when nothing but the
    | proxy can reach the application port.
    |
    | The Host header likewise decides the origin of absolute links in emails
    | and redirects; a forged Host turns those into a phishing vector.
    |
    | Both are read in bootstrap/app.php, which runs before the config
    | repository is bound, so they live in the environment rather than here:
    |
    |   TRUSTED_PROXIES=10.0.0.1,10.0.0.2
    |   APP_TRUSTED_HOSTS=hirehub.com,www.hirehub.com
    |
    | Set them as real process environment variables, not only in .env, so they
    | still apply once `config:cache` is in play.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Debug exposure
    |--------------------------------------------------------------------------
    |
    | A single switch that refuses to let the API hand out stack traces, SQL or
    | environment values, even if APP_DEBUG is accidentally left on in a
    | deployed environment.
    |
    */

    'expose_debug' => (bool) env('SECURITY_EXPOSE_DEBUG', false),

];
