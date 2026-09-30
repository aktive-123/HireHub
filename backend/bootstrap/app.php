<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\RequiresPlanFeature;
use App\Http\Middleware\SecurityHeaders;
use App\Support\ApiExceptionRenderer;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;

/**
 * Split a comma separated environment variable into a clean list.
 *
 * Declared here rather than inside the closure because this file has no class
 * scope, and the middleware callback is a plain closure with no `self` to
 * reach through.
 */
$csv = static fn (?string $value): array => array_values(array_filter(
    array_map('trim', explode(',', (string) $value)),
    static fn (string $item): bool => $item !== '',
));

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) use ($csv): void {
        $middleware->alias([
            'role' => EnsureRole::class,
            'plan' => RequiresPlanFeature::class,
        ]);

        // The Host header decides the origin of every absolute link this API
        // emails or redirects to. Left unrestricted, a forged Host turns a
        // password reset link into a phishing vector — so in any non-local
        // environment the allowed hosts must be listed in APP_TRUSTED_HOSTS.
        //
        // env() rather than config() because the config repository is not bound
        // this early. With `config:cache` in production the .env file is not
        // loaded, so these must be real process environment variables.
        if ($trustedHosts = $csv(env('APP_TRUSTED_HOSTS'))) {
            $middleware->trustHosts(at: $trustedHosts);
        }

        // Behind a load balancer the real client IP and scheme arrive in
        // X-Forwarded-*. Both the rate limiters and the HSTS decision read
        // them, so only the addresses of the real proxy are trusted —
        // otherwise a caller could forge its own IP and bypass every limiter.
        if ($trustedProxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(
                at: $trustedProxies,
                headers: Request::HEADER_X_FORWARDED_FOR
                    | Request::HEADER_X_FORWARDED_HOST
                    | Request::HEADER_X_FORWARDED_PORT
                    | Request::HEADER_X_FORWARDED_SCHEME
                    | Request::HEADER_X_FORWARDED_AWS_ELB,
            );
        }

        // Prepended to the global stack, not appended to the api/web groups,
        // because HandleCors answers a CORS preflight itself and returns
        // without invoking $next. Anything registered after it therefore never
        // runs for OPTIONS, which is exactly where an unprotected response leaks
        // the PHP version. Outermost also covers 404s and redirects.
        $middleware->prepend(SecurityHeaders::class);

        // The rate limiter stays on the api group: preflights and cached asset
        // requests should not spend a caller's allowance.
        $middleware->api(append: [
            ThrottleRequests::class.':api',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // A REST API must never answer with an HTML error page or a 302
        // redirect. Every /api/* failure is rendered as JSON in one consistent
        // envelope so the React client can parse failures uniformly.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $e) => $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(fn (Throwable $e, Request $request) => ApiExceptionRenderer::render($e, $request));
    })->create();
