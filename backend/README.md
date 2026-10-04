# HireHub API

Laravel 12 REST API behind the HireHub React application. Sanitised API responses,
Sanctum bearer tokens, policy-based authorisation, and gateway-agnostic billing
via Paystack, Flutterwave and Stripe.

```
React (frontend/)  ->  Laravel API (backend/)  ->  MySQL
```

## Requirements

- PHP 8.2+
- Composer 2
- MySQL 8 (or MariaDB 10.6+)
- Node 20+ (only needed for the bundled Vite assets)

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

`composer run dev` starts the API, the queue worker, the log tailer and Vite
together.

Seeded credentials come from the environment, never from the repository:

| Variable | Purpose |
| --- | --- |
| `ADMIN_SEED_PASSWORD` | Password for the seeded admin accounts. `AdminSeeder` **skips creating admins in production** when this is unset. |
| `SEED_DEMO_PASSWORD` | Shared password for the seeded demo companies and job seekers. Defaults to `password` outside production. |

Payment keys are also environment-only — see [Payments](#payments). Without
them the app runs fine but cannot take money, and the hire-confirmation button
says so instead of failing silently.

## Layout

| Path | Contents |
| --- | --- |
| `app/Http/Controllers/Api/V1` | One controller per resource, grouped by the role that may call it |
| `app/Http/Resources/V1` | Serialisers — the only place a model shape is defined |
| `app/Policies` | Ownership and authorisation rules |
| `app/Payments` | Gateway-agnostic billing behind `PaymentGateway` |
| `app/Support` | Cross-cutting concerns: response envelope, error mapping, login throttle, frontend URL builder |
| `config/security.php` | Every security threshold, so limits are tuned in one file |

## API surface

All routes are prefixed `/api/v1`. Authentication is a Sanctum bearer token;
send it as `Authorization: Bearer <token>`.

| Group | Prefix | Notes |
| --- | --- | --- |
| Public | `/v1/jobs`, `/v1/companies`, `/v1/categories`, `/v1/plans` | Draft and expired jobs are never exposed |
| Auth | `/v1/auth/register`, `/login`, `/forgot-password`, `/reset-password`, `/email/verify` | Heavily rate limited |
| Seeker | `/v1/seeker/*` | `auth:sanctum` + `role:seeker` |
| Employer | `/v1/employer/*` | `auth:sanctum` + `role:employer` |
| Shared | `/v1/applications`, `/v1/auth/me`, `/v1/auth/logout`, `/v1/settings/profile-picture` | Any signed-in role |
| Admin | `/v1/admin/*` | `auth:sanctum` + `role:admin` |
| Webhooks | `/v1/webhooks/{gateway}` | Unauthenticated by design; every handler requires that gateway's HMAC signature |

Profile pictures are uploaded through the shared authenticated settings routes
and stored on the public disk. The frontend crops accepted JPG, PNG, and WebP
images to a square; the API independently enforces image type, square dimensions,
and a 2 MB limit. Run `php artisan migrate` after deploying the
`profile_picture` column migration, and ensure the public storage link exists
(`php artisan storage:link`) so uploaded images can be displayed.

## Security model

The controls below are enforced centrally, so a new endpoint inherits them
rather than depending on whoever writes it remembering to add them.

### Rate limiting

`ThrottleRequests` and `SecurityHeaders` are appended to the `api` and `web`
middleware groups in `bootstrap/app.php`. Named limiters are defined in
`AppServiceProvider` and keyed by user id when authenticated, falling back to
IP for anonymous traffic — so a whole office behind one NAT is not throttled as a
single client.

| Limiter | Allowance | Applied to |
| --- | --- | --- |
| `api` | 180/min per user, 90/min per IP | Every `/api/*` request |
| `public-read` | 60/min | Job, company and category listings |
| `write` | 30/min per user, 20/min per IP | Every mutating endpoint |
| `auth` | 20/min per IP | Credential endpoints |
| `login` | 30/min per email+IP | Coarse DoS guard |
| `password-reset` | 3/min per email+IP | Recovery and verification resends |
| `webhooks` | 120/min per IP | Gateway callbacks |

`security.lockout_attempts` (default 5) failures within
`security.lockout_decay` seconds lock the account. Three counters run together
— per email+IP, per IP and per email — because each is trivially defeated alone:
a per-IP counter can be spread across a botnet, a per-email counter can lock a
real user out from anywhere.

### Response headers

`App\Http\Middleware\SecurityHeaders` sets `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` and HSTS on every
response, removes `X-Powered-By`, and adds a Content-Security-Policy to
first-party HTML. HSTS waits for real TLS so it never pins a plain-HTTP dev
server.

### Authorisation

- `role:` middleware gates each console; policies (`JobPolicy`,
  `ApplicationPolicy`, `InterviewPolicy`, `CompanyPolicy`) gate the record.
- Privilege columns — `users.role`, `users.status`, `companies.is_verified`,
  `companies.is_featured`, `jobs.is_verified`, `jobs.is_featured` — are **not**
  in `$fillable`. They are assigned with `forceFill` only from registration,
  auth and admin code, so no request payload can escalate a role or self-issue a
  verification badge.
- Scoped listings: an employer only ever sees applicants for their own jobs, a
  seeker only their own applications and interviews.

### Account enumeration

Every path that could confirm whether an address is registered answers
identically:

- Login returns the same message and body whether the password is wrong or the
  account is locked out, and hashes a throwaway value when no account matched so
  the response time does not give it away either.
- Forgot-password always returns the same 200 with the same body.
- Registration role is allowlisted to `seeker` and `employer`, so
  `role=admin` is rejected with a 422.

### Tokens

- Issued tokens carry an expiry (`security.token_ttl`, default 60 days) and the
  role as a Sanctum ability.
- `SANCTUM_TOKEN_PREFIX` defaults to `hh_`, so a leaked token is identifiable by
  secret scanners.
- Changing a password revokes every token for the account, and
  `POST /v1/auth/logout-all` does the same on demand.
- Email verification tokens are 64 random characters, stored as sha256, single
  use and valid for one hour. Requesting a new one revokes the previous.

### Uploads

`POST /v1/seeker/cv` checks the extension, the size, and the MIME type sniffed
from the file's own bytes against an allowlist in `config/security.php`. Stored
names are fully random, the `local` disk sits outside the web root, and
downloads are forced to `application/octet-stream` with `nosniff`.

### Errors

`App\Support\ApiExceptionRenderer` funnels every failure into one JSON envelope
and collapses unmapped exceptions to a generic 500. A stack trace is only ever
returned when **both** `APP_DEBUG` and `SECURITY_EXPOSE_DEBUG` are on, so
`APP_DEBUG=true` left on in a deployed environment cannot leak SQL, paths or
credentials.

## Payments

Two independent things are charged through a gateway:

| Purpose | Charged when | Plan needed |
| --- | --- | --- |
| `Subscription` | An employer picks or renews a plan. | — |
| `HiringFee` | An employer confirms a hire. | An active plan, to have posted the job in the first place. |

The hiring fee is priced server-side from the `hiring_fee_rates` table and
edited at **Admin → Platform Settings**. Amounts are stored in the currency's
minor unit (kobo for NGN) as integers — never floats.

**Nothing is free by default.** With no gateway keys set, `PaymentManager`
reports zero available gateways, and the employer-side "Pay & Confirm Hire"
button is disabled with an explanatory message rather than failing after the
click. To take money, set at least one gateway's keys:

```dotenv
PAYMENT_GATEWAY=paystack
PAYMENT_CURRENCY=NGN

PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_WEBHOOK_SECRET=...
```

`FLUTTERWAVE_*` and `STRIPE_*` are read the same way; see `.env.example` for the
full set. Only gateways with keys are offered to employers, so a half-configured
provider can never be chosen.

### Webhooks

A hire is only finalised once the gateway confirms it, so the callback must be
reachable from the internet in production:

```
POST https://<your-host>/api/v1/webhooks/paystack
POST https://<your-host>/api/v1/webhooks/flutterwave
POST https://<your-host>/api/v1/webhooks/stripe
```

Register the URL for the gateway you use in that provider's dashboard, using the
same `*_WEBHOOK_SECRET`. The signature is the entire authentication story for
these routes, so they are deliberately unauthenticated and throttled — never
disable signature verification to "make webhooks work". If a callback is
delayed or lost, the applicant page reconciles against the provider's own
verify endpoint on the employer's return, which re-checks the amount and
currency before confirming.

## Deployment

### Where to host it

**Not Vercel.** Vercel runs serverless functions with ephemeral filesystems and
no long-lived MySQL socket; a Laravel app that needs a persistent database, a
queue worker and a filesystem for CV uploads does not fit that model. The same
applies to Netlify and Cloudflare Pages — they are static/CDN products, and the
paystack-style webhooks in `POST /api/v1/webhooks/*` need a process that stays
up to receive them.

Also note the React app is **not** a separate deployable. Vite writes its build
straight into `backend/public/build`, so one Laravel process serves both the API
and the site from a single origin — there is no standalone SPA to hand to a
frontend host, and no second origin to configure in CORS.

| Option | Fit | Notes |
| --- | --- | --- |
| Laravel Forge + a VPS (DigitalOcean, Hetzner, Linode) | Best | Nginx, PHP-FPM, queue worker, cron and TLS handled for you; a MySQL box of your own. Cheapest at scale, fewest surprises. |
| Shared PHP hosting (Hostinger, Namecheap) | Fine to start | Point the document root at `backend/public`, composer install, set the env vars below. Ask whether the host allows `artisan queue:work` and scheduled tasks before committing — some shared plans do not. |
| Railway / Render | Workable | Persistent disk plus a MySQL service, and a long-running process for the queue. Simpler than a VPS, more expensive per month at low traffic. |
| Vercel / Netlify | Wrong tool | No persistent PHP process, no MySQL, no queue worker. |

Webhooks have to reach the public URL, so whichever host is chosen must expose
`POST /api/v1/webhooks/{gateway}` on port 443. If the API sits behind a
different origin from the frontend, set that origin in `config/cors.php` and in
`sanctum.stateful` — the SPA reads its token from local storage, so it is not a
CSRF-stateful flow, but the browser still needs CORS permission.

Set these as real environment variables (not only in `.env`, which is not loaded
once `config:cache` is in play):

| Variable | Why |
| --- | --- |
| `APP_TRUSTED_HOSTS` | Restricts the `Host` header. Without it a forged host rewrites the origin of every emailed reset link. |
| `TRUSTED_PROXIES` | Only these addresses may set `X-Forwarded-*`, which the rate limiters and HSTS both read. |
| `FRONTEND_URL` | Origin for verification, reset and payment-return links. |
| `PAYMENT_GATEWAY`, `PAYMENT_CURRENCY`, and that gateway's keys | Without them subscriptions cannot be bought and hires cannot be confirmed. See [Payments](#payments). |
| `APP_DEBUG=false`, `SECURITY_EXPOSE_DEBUG=false` | Never ship stack traces. |
| `MAIL_ENABLED=true`, `MAIL_MAILER`, provider credentials, `BREVO_API_KEY` | Required for email. Password-reset OTPs use Brevo's HTTPS API; other mail follows the configured Laravel mailer. |


`SESSION_SECURE_COOKIE` defaults to true everywhere except `APP_ENV=local`, where
XAMPP serves over plain HTTP.

In `php.ini` for any deployed environment:

```ini
expose_php = Off
```

`X-Powered-By` is stripped by the application too, but PHP emits that header at
the SAPI level, below anything the framework can intercept — the ini setting is
what actually closes it.

## Tests

```bash
composer test     # PHPUnit
composer lint     # Pint, in check mode
composer analyse  # PHPStan level 5 via Larastan
composer check    # all three, in the order a CI run would
```

`tests/Feature/SecurityTest.php` holds the Stage 15 regression cover: one test
per attack the hardening prevents, so removing a control turns the suite red
rather than passing quietly.

`tests/Feature/HiringFeeTest.php` holds the same guarantee for the placement
fee: a client that skips the modal must be stopped by the API just as firmly as
one that goes through it, so a hire cannot exist without a matching successful
payment.

Static analysis is baselined (`stan-baseline.neon`) rather than clean, because
larastan cannot infer Eloquent's enum casts and infers `firstOrFail()` as a
bare `Model`. The baseline is the *current* state: new code is analysed at full
strength, so a genuine regression fails CI. The baseline was generated with the
`RuntimeException` import in `StripeGateway` present — reintroduce that bug and
`composer analyse` fails with `class.notFound`.


## Licence

MIT
