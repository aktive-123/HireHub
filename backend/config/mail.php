<?php

return [

    'enabled' => env('MAIL_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | This option controls the default mailer that is used to send all email
    | messages unless another mailer is explicitly specified when sending
    | the message. All additional mailers can be configured within the
    | "mailers" array. Examples of each type of mailer are provided.
    |
    */

    'default' => env('MAIL_MAILER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | Here you may configure all of the mailers used by your application plus
    | their respective settings. Several examples have been configured for
    | you and you are free to add your own as your application requires.
    |
    | Laravel supports a variety of mail "transport" drivers that can be used
    | when delivering an email. You may specify which one you're using for
    | your mailers below. You may also add additional mailers if needed.
    |
    | Supported: "smtp", "sendmail", "mailgun", "ses", "ses-v2",
    |            "postmark", "resend", "log", "array",
    |            "failover", "roundrobin"
    |
    */

    'mailers' => [

        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME') ?: (env('MAIL_ENCRYPTION') === 'ssl' ? 'smtps' : (env('MAIL_ENCRYPTION') === 'tls' ? 'smtp' : null)),
            'encryption' => env('MAIL_ENCRYPTION'),
            // A single MAIL_URL of the form smtp://user:pass@host:port overrides
            // the discrete settings below, which is how every provider
            // documents its credentials. Keep both paths working so switching
            // between SendGrid, Mailgun and SES is a one-line env change.
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 587),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],

        'mailgun' => [
            'transport' => 'mailgun',
            // Mailgun's own API rather than its SMTP endpoint: it returns a
            // delivery id, so a webhook can later confirm the inbox hand-off.
            'domain' => env('MAIL_MAILGUN_DOMAIN'),
            'secret' => env('MAIL_MAILGUN_SECRET'),
            'endpoint' => env('MAIL_MAILGUN_ENDPOINT', 'api.mailgun.net'),
            'scheme' => 'https',
        ],

        'ses' => [
            'transport' => 'ses',
        ],

        'postmark' => [
            'transport' => 'postmark',
            // 'message_stream_id' => env('POSTMARK_MESSAGE_STREAM_ID'),
            // 'client' => [
            //     'timeout' => 5,
            // ],
        ],

        'resend' => [
            'transport' => 'resend',
        ],

        'sendmail' => [
            'transport' => 'sendmail',
            'path' => env('MAIL_SENDMAIL_PATH', '/usr/sbin/sendmail -bs -i'),
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            // Deliberately does NOT include the log mailer. A failover chain
            // that ends at `log` reports success while the one-time password
            // is never actually delivered, which is worse than an outright
            // failure: the user waits ten minutes for a code that was never
            // sent. Add a real second transport here if you want redundancy.
            'mailers' => array_values(array_filter(array_map(
                'trim',
                explode(',', (string) env('MAIL_FAILOVER_MAILERS', 'smtp'))
            ))),
            'retry_after' => 60,
        ],

        'roundrobin' => [
            'transport' => 'roundrobin',
            'mailers' => [
                'ses',
                'postmark',
            ],
            'retry_after' => 60,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    |
    | You may wish for all emails sent by your application to be sent from
    | the same address. Here you may specify a name and address that is
    | used globally for all emails that are sent by your application.
    |
    */

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
        'name' => env('MAIL_FROM_NAME', env('APP_NAME', 'Laravel')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Public origin used for absolute links in emails
    |--------------------------------------------------------------------------
    |
    | Mail clients resolve relative paths against nothing, so a template cannot
    | reference the bundled logo relatively. This is the origin that remote
    | images and support links in transactional mail are built from; it must be
    | publicly reachable, which means it is usually NOT FRONTEND_URL (that is
    | often a private Vite dev server) but the deployed site.
    |
    */

    'from_assets_url' => env('MAIL_ASSETS_URL', env('APP_URL', 'http://localhost')),

    /*
    |--------------------------------------------------------------------------
    | Logo used in transactional mail
    |--------------------------------------------------------------------------
    |
    | Absolute URL of the brand logo, because mail clients resolve relative
    | paths against nothing. Defaults to the site origin plus `/build/logo.png`,
    | which is where Vite copies `frontend/public/logo.png` — the served root
    | has no `/logo.png`, so guessing the bare filename shipped a broken image
    | in every code email. Override with MAIL_LOGO_URL when the logo lives
    | somewhere else, such as a CDN.
    |
    */

    'logo_url' => env('MAIL_LOGO_URL') ?: rtrim((string) env('MAIL_ASSETS_URL', env('APP_URL', 'http://localhost')), '/').'/build/logo.png',

];
