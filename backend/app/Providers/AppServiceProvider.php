<?php

namespace App\Providers;

use App\Models\Application;
use App\Models\Company;
use App\Models\Interview;
use App\Models\Job;
use App\Policies\ApplicationPolicy;
use App\Policies\CompanyPolicy;
use App\Policies\InterviewPolicy;
use App\Policies\JobPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Ownership rules live in policies so every entry point (API routes,
        // future console/admin commands) enforces them the same way instead of
        // repeating inline ownership comparisons across controllers.
        Gate::policy(Job::class, JobPolicy::class);
        Gate::policy(Application::class, ApplicationPolicy::class);
        Gate::policy(Interview::class, InterviewPolicy::class);
        Gate::policy(Company::class, CompanyPolicy::class);

        $this->registerRateLimiters();
    }

    /**
     * Named limiters instead of inline `throttle:60,1` strings.
     *
     * A named limiter can be keyed by the authenticated user rather than the
     * IP, so a whole office behind one NAT is not throttled as a single client,
     * and a single host cannot impersonate many users. Anonymous requests still
     * fall back to the IP, which is the only identifier available then.
     */
    private function registerRateLimiters(): void
    {
        $byUserOrIp = fn (Request $request) => $request->user()?->id
            ? (string) $request->user()->id
            : 'ip:'.$request->ip();

        RateLimiter::for('api', fn (Request $request) => [
            Limit::perMinute(180)->by($byUserOrIp($request)),
            Limit::perMinute(90)->by('ip:'.$request->ip()),
        ]);

        // Job and company listings are the highest traffic surface and are
        // almost entirely anonymous, so the IP allowance has to survive an
        // office or campus behind a single NAT address.
        RateLimiter::for('public-read', fn (Request $request) => [
            Limit::perMinute(60)->by($byUserOrIp($request)),
            Limit::perMinute(60)->by('ip:'.$request->ip()),
        ]);

        // Writes are what cost the platform money and rows, so they are
        // capped harder than reads.
        RateLimiter::for('write', fn (Request $request) => [
            Limit::perMinute(30)->by($byUserOrIp($request)),
            Limit::perMinute(20)->by('ip:'.$request->ip()),
        ]);

        RateLimiter::for('auth', fn (Request $request) => [
            Limit::perMinute(20)->by('ip:'.$request->ip()),
        ]);

        // Coarse DoS guard on credential endpoints, keyed on the submitted
        // address so one host cannot rotate through a password-spray list.
        //
        // Deliberately far looser than the per-account lockout in
        // App\Support\LoginThrottle. If this fired first, a locked-out attempt
        // would come back as a 429 — a different status and body from a wrong
        // password, which is exactly the signal an attacker uses to confirm an
        // address is registered. The controller owns the lockout semantics and
        // answers every failure identically; this only catches gross abuse.
        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(30)->by(strtolower((string) $request->input('email')).'|'.$request->ip()),
        ]);

        RateLimiter::for('password-reset', fn (Request $request) => [
            Limit::perMinute(3)->by(strtolower((string) $request->input('email')).'|'.$request->ip()),
        ]);

        /*
         * One-time password delivery.
         *
         * Two limiters, because "sending" and "checking" are different threats:
         *
         *   otp         asks "who wants mail sent?" — the attack is spraying one
         *               host across many target addresses, so this is keyed by IP
         *               alone. It is deliberately looser than the per-address
         *               budget in App\Support\Otp, which owns the real 3-per-15
         *               minutes limit; this only catches gross abuse.
         *   otp-verify  asks "who is guessing codes?" — six digits is a million
         *               values, so an unthrottled verify endpoint would hand a
         *               correct code to a script within the ten-minute window.
         *               Keyed by address+IP, and tight enough that brute force is
         *               hopeless while a mistyped code is still forgiving.
         */
        RateLimiter::for('otp', fn (Request $request) => [
            Limit::perMinute(10)->by($request->ip()),
        ]);

        RateLimiter::for('otp-verify', fn (Request $request) => [
            Limit::perMinute(10)->by(strtolower((string) $request->input('email')).'|'.$request->ip()),
        ]);

        RateLimiter::for('webhooks', fn (Request $request) => [
            Limit::perMinute(120)->by($request->ip()),
        ]);
    }
}
