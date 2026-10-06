<?php

namespace App\Models;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * `role` and `status` are deliberately absent. They are privilege columns:
     * any endpoint that filled them from request input would be a vertical
     * privilege escalation, so they are only ever assigned explicitly by the
     * registration, auth and admin code paths.
     *
     * `must_change_password` is absent for a different reason: a user must never
     * be able to clear it for themselves through a generic settings payload. It
     * is set only by an admin reset and cleared only by the password change
     * that satisfies it.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'headline',
        'avatar_url',
        // Account-settings columns. Safe to fill: none of these grant access
        // or change the account's standing, and each is re-validated with a
        // bounded shape at the controller before it is written.
        'timezone',
        'two_factor_enabled',
        'email_preferences',
        'notification_preferences',
        'privacy_preferences',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'status' => AccountStatus::class,
            'two_factor_enabled' => 'boolean',
            'must_change_password' => 'boolean',
            'email_preferences' => 'array',
            'notification_preferences' => 'array',
            'privacy_preferences' => 'array',
        ];
    }

    /**
     * Issue a bearer token carrying the role as a Sanctum ability, so a token
     * cannot be replayed against a different role's scope even if the guard is
     * ever misconfigured.
     */
    public function issueToken(string $name = 'auth', ?string $device = null): string
    {
        $label = $device ? "{$name}:{$device}" : $name;

        return $this->createToken($label, [$this->role->value], now()->addSeconds((int) config('security.token_ttl')))->plainTextToken;
    }

    /**
     * Invalidate every outstanding credential. Called on password change so a
     * session stolen before the change cannot outlive it.
     */
    public function revokeTokens(): void
    {
        $this->tokens()->delete();
    }

    public function profilePictureUrl(): ?string
    {
        return $this->profile_picture
            ? Storage::disk('public')->url($this->profile_picture)
            : $this->avatar_url;
    }

    public function hasVerifiedEmail(): bool
    {
        return $this->email_verified_at !== null;
    }

    /**
     * Whether this account is signed in on a password somebody else chose.
     *
     * True only between an admin-issued reset and the owner replacing it, so
     * the API can withhold normal use of the account until that happens rather
     * than trusting the user to notice an email.
     */
    public function requiresPasswordChange(): bool
    {
        return $this->must_change_password === true;
    }

    public function isSeeker(): bool
    {
        return $this->role === UserRole::Seeker;
    }

    public function isEmployer(): bool
    {
        return $this->role === UserRole::Employer;
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function company(): HasOne
    {
        return $this->hasOne(Company::class);
    }

    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'seeker_id');
    }

    public function savedJobs(): HasMany
    {
        return $this->hasMany(SavedJob::class, 'seeker_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    /**
     * One-time passwords issued to this account.
     *
     * Cascade on delete so an account removal takes its codes with it — a
     * leftover code for a deleted user would otherwise still be redeemable
     * against a newly registered owner of the same address.
     */
    public function otpCodes(): HasMany
    {
        return $this->hasMany(OtpCode::class);
    }
}
