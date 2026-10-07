<?php

use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AdminInvitationController;
use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\EmployerController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\InterviewController;
use App\Http\Controllers\Api\V1\JobController;
use App\Http\Controllers\Api\V1\NewsletterController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PlanController;
use App\Http\Controllers\Api\V1\ReceiptController;
use App\Http\Controllers\Api\V1\SeekerController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\UpsellController;
use App\Http\Controllers\Api\V1\VerificationController;
use App\Http\Controllers\Api\V1\WebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    // --- Public resources ---
    Route::get('health', HealthController::class)->middleware('throttle:public-read');

    Route::get('jobs', [JobController::class, 'index'])->middleware('throttle:public-read');
    Route::get('jobs/{job}', [JobController::class, 'show'])->middleware('throttle:public-read');

    Route::get('companies', [CompanyController::class, 'index'])->middleware('throttle:public-read');
    Route::get('companies/{company}', [CompanyController::class, 'show'])->middleware('throttle:public-read');

    Route::get('categories', [CategoryController::class, 'index'])->middleware('throttle:public-read');
    Route::get('categories/{category}', [CategoryController::class, 'show'])->middleware('throttle:public-read');

    Route::get('plans', [PlanController::class, 'index'])->middleware('throttle:public-read');
    Route::get('plans/{plan}', [PlanController::class, 'show'])->middleware('throttle:public-read');

    // --- Newsletter ---
    // Public and unauthenticated, so it carries the stricter `write` cap: a
    // single visitor could otherwise flood the table with addresses that never
    // get confirmed. The response is identical for new, existing and unknown
    // addresses, so this endpoint cannot be used to test whether someone is
    // subscribed.
    Route::post('newsletter/subscribe', [NewsletterController::class, 'store'])
        ->middleware('throttle:write')
        ->name('newsletter.subscribe');

    // The confirmation link arrives by email, so the token itself is the
    // credential. It is a signed, expiring URL to stop a forged or replayed one.
    Route::get('newsletter/confirm/{token}', [NewsletterController::class, 'confirm'])
        ->middleware(['signed', 'throttle:public-read'])
        ->name('newsletter.confirm');

    // Mail clients follow this from the List-Unsubscribe header without showing
    // the user a page, so it is signed and answers success either way.
    Route::get('newsletter/unsubscribe/{token}', [NewsletterController::class, 'unsubscribe'])
        ->middleware(['signed', 'throttle:public-read'])
        ->name('newsletter.unsubscribe');

    // --- Admin invitations ---
    //
    // Unauthenticated on purpose: the invitee has no account yet, so the
    // token in the path *is* the credential. It is 32 random bytes, looked up
    // by hash, single-use and expiring — which is what lets these two live
    // without a session. The GET is read-only and capped with the other
    // public reads; the POST mints accounts, so it carries the generic
    // credential cap.
    Route::get('admin-invitations/{token}', [AdminInvitationController::class, 'preview'])
        ->middleware('throttle:public-read');
    Route::post('admin-invitations/{token}/accept', [AdminInvitationController::class, 'accept'])
        ->middleware('throttle:auth');

    // --- Auth ---
    // Credential endpoints carry their own named limiters: the generic `auth`
    // cap stops one host from spraying, while `login` additionally counts per
    // submitted address so a botnet cannot grind a single account.
    Route::post('auth/register', [AuthController::class, 'register'])->middleware(['throttle:auth', 'throttle:login']);
    Route::post('auth/login', [AuthController::class, 'login'])->middleware(['throttle:auth', 'throttle:login']);

    // --- One-time passwords ---
    //
    // Unauthenticated by design, and this is the load-bearing part of the OTP
    // design: a brand new account has no bearer token yet, which is the whole
    // reason the code exists. Possession of the emailed code is the proof, so
    // these cannot require auth — and every response here is written to be
    // identical for a registered and an unregistered address.
    //
    // `otp` is the tightest limiter in the application (3 per 15 minutes per
    // address+IP, plus a 60s resend cooldown enforced inside the service).
    // These endpoints are a mail-bomb primitive aimed at any address on the
    // internet, so they are the one place the coarse `auth` cap is not enough.
    Route::post('auth/forgot-password', [VerificationController::class, 'forgotPassword'])
        ->middleware('throttle:otp');

    Route::post('auth/otp/verify', [VerificationController::class, 'verify'])
        ->middleware('throttle:otp-verify');

    Route::post('auth/otp/resend', [VerificationController::class, 'resend'])
        ->middleware('throttle:otp');

    Route::post('auth/reset-password', [VerificationController::class, 'resetPassword'])
        ->middleware(['throttle:auth', 'throttle:otp-verify']);

    // --- Payment provider callbacks ---
    // Unauthenticated by design; each handler rejects anything without a valid
    // HMAC signature from that specific provider.
    Route::post('webhooks/{gateway}', [WebhookController::class, 'handle'])
        ->middleware('throttle:webhooks');
});

// --- Job seeker console (role-gated) ---
Route::middleware(['auth:sanctum', 'role:seeker'])->prefix('v1')->group(function (): void {
    Route::get('seeker/dashboard', [SeekerController::class, 'dashboard']);
    Route::get('seeker/applications', [SeekerController::class, 'applications']);
    Route::post('seeker/applications', [SeekerController::class, 'apply'])->middleware('throttle:write');
    Route::get('seeker/applications/{id}', [SeekerController::class, 'application']);
    // Accepting or declining an offer is the seeker's decision and is never
    // charged, so it settles no money.
    Route::post('seeker/applications/{id}/accept-offer', [SeekerController::class, 'acceptOffer'])->middleware('throttle:write');
    Route::post('seeker/applications/{id}/decline-offer', [SeekerController::class, 'declineOffer'])->middleware('throttle:write');
    // Paid add-ons, only ever offered once an offer has been accepted.
    Route::get('seeker/applications/{id}/upsells', [UpsellController::class, 'index']);
    Route::post('seeker/applications/{id}/upsells/checkout', [UpsellController::class, 'checkout'])->middleware('throttle:write');
    Route::get('seeker/saved-jobs', [SeekerController::class, 'savedJobs']);
    Route::post('seeker/saved-jobs', [SeekerController::class, 'saveJob'])->middleware('throttle:write');
    Route::delete('seeker/saved-jobs/{jobId}', [SeekerController::class, 'unSaveJob'])->middleware('throttle:write');
    Route::get('seeker/profile', [SeekerController::class, 'profile']);
    Route::patch('seeker/profile', [SeekerController::class, 'updateProfile'])->middleware('throttle:write');
    Route::get('seeker/notifications', [SeekerController::class, 'notifications']);
    Route::patch('seeker/notifications/{id}/read', [SeekerController::class, 'markNotificationRead'])->middleware('throttle:write');
    Route::post('seeker/notifications/read-all', [SeekerController::class, 'markAllNotificationsRead'])->middleware('throttle:write');
    Route::get('seeker/cv', [SeekerController::class, 'cv']);
    Route::post('seeker/cv', [SeekerController::class, 'uploadCv'])->middleware('throttle:write');
    Route::delete('seeker/cv', [SeekerController::class, 'deleteCv'])->middleware('throttle:write');
    Route::get('seeker/cv/download', [SeekerController::class, 'downloadCv']);
    Route::get('seeker/interviews', [InterviewController::class, 'seekerIndex']);
});

// --- Employer console (role-gated) ---
Route::middleware(['auth:sanctum', 'role:employer'])->prefix('v1')->group(function (): void {
    Route::get('employer/dashboard', [EmployerController::class, 'dashboard']);
    Route::get('employer/jobs', [EmployerController::class, 'jobs']);
    Route::post('employer/jobs', [EmployerController::class, 'storeJob'])->middleware('throttle:write');
    Route::put('employer/jobs/{job}', [EmployerController::class, 'updateJob'])->middleware('throttle:write');
    Route::patch('employer/jobs/{job}/status', [EmployerController::class, 'updateJobStatus'])->middleware('throttle:write');
    Route::patch('employer/jobs/{job}/featured', [EmployerController::class, 'featureJob'])->middleware('throttle:write');
    Route::delete('employer/jobs/{job}', [EmployerController::class, 'deleteJob'])->middleware('throttle:write');
    // Plan-gated. The `plan` middleware reads the entitlements column on the
    // company's live plan and rejects with 403 `plan_upgrade_required` when the
    // capability is not granted, so the data behind the paywall is never
    // serialised for a plan that has not paid for it.
    Route::get('employer/analytics', [EmployerController::class, 'analytics'])->middleware('plan:analytics');
    Route::get('employer/applicants', [EmployerController::class, 'applicants']);
    Route::get('employer/applicants/{application}', [EmployerController::class, 'applicant']);
    Route::patch('employer/applicants/{application}/status', [EmployerController::class, 'updateApplicationStatus'])->middleware('throttle:write');
    // --- Hiring fee (employer pays; job seekers never reach these) ---
    Route::get('employer/hiring-fees', [EmployerController::class, 'hiringFees']);
    // A hiring fee has its own reference, but its receipt is keyed on the
    // payment behind it. Exposed under the fee's reference so the Placement
    // Fees table can link each row without knowing about payments.
    Route::get('employer/hiring-fees/{reference}/receipt', [ReceiptController::class, 'showForHiringFee']);
    Route::get('employer/hiring-fees/{reference}/receipt/download', [ReceiptController::class, 'downloadForHiringFee']);
    Route::get('employer/applicants/{application}/hiring-fee', [EmployerController::class, 'hiringFeeQuote']);
    Route::post('employer/applicants/{application}/hiring-fee/checkout', [EmployerController::class, 'createHiringFeeCheckout'])->middleware('throttle:write');
    Route::get('employer/applicants/{application}/hiring-fee/status', [EmployerController::class, 'hiringFeeStatus']);
    Route::get('employer/applicants/{application}/cv', [EmployerController::class, 'downloadCv']);
    Route::get('employer/company', [EmployerController::class, 'company']);
    Route::put('employer/company', [EmployerController::class, 'updateCompany'])->middleware('throttle:write');
    Route::get('employer/notifications', [EmployerController::class, 'notifications']);
    Route::patch('employer/notifications/{id}/read', [EmployerController::class, 'markNotificationRead'])->middleware('throttle:write');
    Route::post('employer/notifications/read-all', [EmployerController::class, 'markAllNotificationsRead'])->middleware('throttle:write');
    Route::get('employer/interviews', [InterviewController::class, 'employerIndex']);
    Route::post('employer/interviews', [InterviewController::class, 'schedule'])->middleware('throttle:write');
    Route::get('employer/interviews/{interview}', [InterviewController::class, 'employerShow']);
    Route::patch('employer/interviews/{interview}', [InterviewController::class, 'update'])->middleware('throttle:write');
    Route::patch('employer/interviews/{interview}/status', [InterviewController::class, 'updateStatus'])->middleware('throttle:write');
    Route::delete('employer/interviews/{interview}', [InterviewController::class, 'destroy'])->middleware('throttle:write');

    // --- Billing (employer's own company only) ---
    // Checkout init is rate limited so the gateway quota cannot be exhausted
    // by a single tenant spamming the endpoint.
    Route::post('employer/billing/checkout', [PaymentController::class, 'initialize'])
        ->middleware('throttle:write');
    Route::post('employer/billing/checkout/change-plan', [PaymentController::class, 'changePlan'])
        ->middleware('throttle:write');
    Route::post('employer/billing/subscription/renew', [PaymentController::class, 'renew'])
        ->middleware('throttle:write');
    Route::get('employer/billing/usage', [PaymentController::class, 'usage']);
    Route::get('employer/billing/subscription', [PaymentController::class, 'subscription']);
    Route::post('employer/billing/subscription/cancel', [PaymentController::class, 'cancel'])->middleware('throttle:write');
    Route::get('employer/billing/payments', [PaymentController::class, 'index']);
    Route::get('employer/billing/payments/{reference}', [PaymentController::class, 'show']);
    // Receipts are addressed by the payment reference so the existing
    // Payment History rows can link straight at them with no extra id.
    Route::get('employer/billing/receipts/{reference}', [ReceiptController::class, 'show']);
    Route::get('employer/billing/receipts/{reference}/download', [ReceiptController::class, 'download']);
});

// --- Shared authenticated routes (any signed-in role) ---
Route::middleware(['auth:sanctum'])->prefix('v1')->group(function (): void {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/logout-all', [AuthController::class, 'logoutAll']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // --- Account settings (self-scoped, any role) ---
    Route::get('settings', [SettingsController::class, 'show']);
    Route::patch('settings', [SettingsController::class, 'update'])->middleware('throttle:write');
    Route::post('settings/profile-picture', [SettingsController::class, 'uploadProfilePicture'])->middleware('throttle:write');
    Route::delete('settings/profile-picture', [SettingsController::class, 'deleteProfilePicture'])->middleware('throttle:write');
    Route::patch('auth/password', [SettingsController::class, 'updatePassword'])->middleware('throttle:write');
    Route::post('account/deactivate', [SettingsController::class, 'deactivate'])->middleware('throttle:write');
    Route::post('account/reactivate', [SettingsController::class, 'reactivate'])->middleware('throttle:write');

    // Re-sending is rate limited per address: without it, this endpoint is a
    // free mail-bomb primitive pointed at any registered user.
    Route::post('auth/email/verification-notification', [VerificationController::class, 'send'])
        ->middleware('throttle:otp');

    // Scoped to the caller's own records inside the controller — an
    // unscoped application listing would expose every applicant's PII.
    Route::get('applications', [ApplicationController::class, 'index']);
    Route::get('applications/{application}', [ApplicationController::class, 'show']);
});

// --- Admin console (role-gated) ---
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('v1/admin')->group(function (): void {
    Route::get('dashboard', [AdminController::class, 'dashboard']);
    Route::get('users', [AdminController::class, 'users']);
    Route::patch('users/{user}/status', [AdminController::class, 'updateUserStatus'])->middleware('throttle:write');
    Route::post('users/{user}/reset-password', [AdminController::class, 'resetUserPassword'])->middleware('throttle:write');
    Route::delete('users/{user}', [AdminController::class, 'deleteUser'])->middleware('throttle:write');
    // Invite-only admin creation: issuance and revocation are admin-gated
    // here; the public accept half lives outside this group above.
    Route::get('invitations', [AdminInvitationController::class, 'index']);
    Route::post('invitations', [AdminInvitationController::class, 'store'])->middleware('throttle:write');
    Route::delete('invitations/{invitation}', [AdminInvitationController::class, 'destroy'])->middleware('throttle:write');
    Route::get('job-seekers', [AdminController::class, 'jobSeekers']);
    Route::get('employers', [AdminController::class, 'employers']);
    Route::get('companies', [AdminController::class, 'companies']);
    Route::post('companies', [AdminController::class, 'storeCompany'])->middleware('throttle:write');
    Route::put('companies/{company}', [AdminController::class, 'updateCompany'])->middleware('throttle:write');
    Route::patch('companies/{company}/status', [AdminController::class, 'updateCompanyStatus'])->middleware('throttle:write');
    Route::get('jobs', [AdminController::class, 'jobs']);
    Route::patch('jobs/{job}/status', [AdminController::class, 'updateJobStatus'])->middleware('throttle:write');
    Route::delete('jobs/{job}', [AdminController::class, 'deleteJob'])->middleware('throttle:write');
    Route::get('applications', [AdminController::class, 'applications']);
    Route::get('applications/{application}', [AdminController::class, 'application']);
    Route::patch('applications/{application}/status', [AdminController::class, 'updateApplicationStatus'])->middleware('throttle:write');
    Route::get('categories', [AdminController::class, 'categories']);
    Route::post('categories', [AdminController::class, 'storeCategory'])->middleware('throttle:write');
    Route::put('categories/{category}', [AdminController::class, 'updateCategory'])->middleware('throttle:write');
    Route::delete('categories/{category}', [AdminController::class, 'deleteCategory'])->middleware('throttle:write');
    Route::get('skills', [AdminController::class, 'skills']);
    Route::get('reports', [AdminController::class, 'reports']);
    // --- Hiring fee revenue & rate management ---
    Route::get('hiring-fees', [AdminController::class, 'hiringFees']);
    Route::get('hiring-fees/summary', [AdminController::class, 'hiringFeeSummary']);
    Route::get('upsell-summary', [AdminController::class, 'upsellSummary']);
    Route::get('hiring-fee-rates', [AdminController::class, 'hiringFeeRates']);
    // Admin reads every receipt on the platform, so these sit inside the
    // role:admin group with no company scoping.
    Route::get('receipts/{reference}', [ReceiptController::class, 'show']);
    Route::get('receipts/{reference}/download', [ReceiptController::class, 'download']);
    Route::post('hiring-fee-rates', [AdminController::class, 'storeHiringFeeRate'])->middleware('throttle:write');
    Route::put('hiring-fee-rates/{hiringFeeRate}', [AdminController::class, 'updateHiringFeeRate'])->middleware('throttle:write');
    Route::delete('hiring-fee-rates/{hiringFeeRate}', [AdminController::class, 'deleteHiringFeeRate'])->middleware('throttle:write');
    Route::get('activity-logs', [AdminController::class, 'activityLogs']);
    Route::get('settings', [AdminController::class, 'settings']);
    Route::patch('settings', [AdminController::class, 'updateSettings'])->middleware('throttle:write');
});
