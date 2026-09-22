<?php

use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\EmployerController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\JobController;
use App\Http\Controllers\Api\V1\SeekerController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    // --- Public resources ---
    Route::get('health', HealthController::class);

    Route::get('jobs', [JobController::class, 'index']);
    Route::get('jobs/{job}', [JobController::class, 'show']);

    Route::get('companies', [CompanyController::class, 'index']);
    Route::get('companies/{company}', [CompanyController::class, 'show']);

    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('categories/{category}', [CategoryController::class, 'show']);

    // --- Auth ---
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);
});

// --- Stage 12: authenticated routes (Sanctum) ---
Route::middleware(['auth:sanctum'])->prefix('v1')->group(function (): void {
    // --- Auth ---
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // --- Job Seeker ---
    Route::get('seeker/dashboard', [SeekerController::class, 'dashboard']);
    Route::get('seeker/applications', [SeekerController::class, 'applications']);
    Route::get('seeker/applications/{id}', [SeekerController::class, 'application']);
    Route::get('seeker/saved-jobs', [SeekerController::class, 'savedJobs']);
    Route::post('seeker/saved-jobs', [SeekerController::class, 'saveJob']);
    Route::delete('seeker/saved-jobs/{jobId}', [SeekerController::class, 'unSaveJob']);
    Route::get('seeker/profile', [SeekerController::class, 'profile']);
    Route::patch('seeker/profile', [SeekerController::class, 'updateProfile']);
    Route::get('seeker/notifications', [SeekerController::class, 'notifications']);
    Route::patch('seeker/notifications/{id}/read', [SeekerController::class, 'markNotificationRead']);

    // --- Employer ---
    Route::get('employer/dashboard', [EmployerController::class, 'dashboard']);
    Route::get('employer/jobs', [EmployerController::class, 'jobs']);
    Route::post('employer/jobs', [EmployerController::class, 'storeJob']);
    Route::put('employer/jobs/{job}', [EmployerController::class, 'updateJob']);
    Route::patch('employer/jobs/{job}/status', [EmployerController::class, 'updateJobStatus']);
    Route::delete('employer/jobs/{job}', [EmployerController::class, 'deleteJob']);
    Route::get('employer/applicants', [EmployerController::class, 'applicants']);
    Route::get('employer/applicants/{application}', [EmployerController::class, 'applicant']);
    Route::patch('employer/applicants/{application}/status', [EmployerController::class, 'updateApplicationStatus']);
    Route::get('employer/company', [EmployerController::class, 'company']);
    Route::put('employer/company', [EmployerController::class, 'updateCompany']);
    Route::get('employer/notifications', [EmployerController::class, 'notifications']);

    // --- Applications (scoped views live under seeker/employer) ---
    Route::get('applications', [ApplicationController::class, 'index']);
    Route::get('applications/{application}', [ApplicationController::class, 'show']);
});
