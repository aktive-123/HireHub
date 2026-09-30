<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applies the response headers a public API and a browser-facing SPA both need.
 *
 * These are set centrally rather than per controller so a new endpoint cannot
 * ship without them, and so the policy is auditable in one file.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Fingerprints the exact PHP/Laravel build in production. Purely
        // reconnaissance value for an attacker, so it is always removed.
        //
        // Two layers, because the header can arrive from two places: this
        // strips one a package or the framework set on the response, while
        // header_remove() handles the one PHP's own `expose_php` ini setting
        // emits at the SAPI level, below anything the framework can see.
        $response->headers->remove('X-Powered-By');
        if (! headers_sent()) {
            header_remove('X-Powered-By');
        }

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', config('security.referrer_policy'));
        $response->headers->set('Permissions-Policy', config('security.permissions_policy'));
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-site');

        // The legacy X-XSS- auditor was itself exploitable; browsers ignore it
        // and the CSP below is the real control.
        $response->headers->set('X-XSS-Protection', '0');

        // Defence in depth against subdomain takeover serving foreign script
        // into an authenticated origin. Only meaningful on real HTML.
        if (! $request->is('api/*')) {
            $response->headers->set('Content-Security-Policy', $this->buildCsp());
        }

        if ($this->shouldSendHsts($request)) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age='.config('security.hsts_max_age').'; includeSubDomains',
            );
        }

        return $response;
    }

    /**
     * HSTS pins a hostname to HTTPS for the whole `max-age` window. Emitting it
     * on a plain-HTTP local dev server would break Vite HMR and localhost
     * browsing until the browser cache expired, so it waits for real TLS.
     */
    private function shouldSendHsts(Request $request): bool
    {
        return $request->isSecure() || ! app()->environment('local');
    }

    private function buildCsp(): string
    {
        $directives = [];

        foreach (config('security.csp', []) as $directive => $values) {
            $directives[] = $values === true
                ? $directive
                : $directive.' '.implode(' ', (array) $values);
        }

        return implode('; ', $directives);
    }
}
