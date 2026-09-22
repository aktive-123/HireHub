<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\V1\UserResource;
use App\Models\Company;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends ApiController
{
    public function register(Request $request)
    {
        $role = $request->input('role', 'seeker');

        if ($role === 'employer') {
            $validated = $request->validate([
                'full_name' => ['required', 'string', 'max:255'],
                'company_name' => ['required', 'string', 'max:255'],
                'work_email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
                'company_size' => ['nullable', 'string', 'max:255'],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
            ]);

            $user = User::create([
                'name' => $validated['full_name'],
                'email' => $validated['work_email'],
                'password' => $validated['password'],
                'role' => UserRole::Employer,
                'status' => AccountStatus::Active,
                'email_verified_at' => now(),
            ]);

            Company::create([
                'user_id' => $user->id,
                'slug' => Str::slug($validated['company_name']).'-'.strtolower(Str::random(6)),
                'name' => $validated['company_name'],
                'size' => $validated['company_size'] ?? null,
                'status' => 'active',
            ]);
        } else {
            $validated = $request->validate([
                'first_name' => ['required', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
            ]);

            $user = User::create([
                'name' => trim($validated['first_name'].' '.$validated['last_name']),
                'email' => $validated['email'],
                'password' => $validated['password'],
                'role' => UserRole::Seeker,
                'status' => AccountStatus::Active,
                'email_verified_at' => now(),
            ]);

            Profile::create(['user_id' => $user->id]);
        }

        $token = $user->createToken('auth', [$user->role->value]);

        return $this->success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ], 'Registration successful.', 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return $this->error('Invalid credentials.', 401, ['email' => 'These credentials do not match our records.']);
        }

        if ($user->status === AccountStatus::Suspended) {
            return $this->error('Account suspended.', 403);
        }

        $token = $user->createToken('auth', [$user->role->value]);

        return $this->success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ], 'Login successful.');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->success(null, 'Logged out.');
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $role = $user->role->value;

        if ($role === 'seeker') {
            $user->load('profile');
        }

        if ($role === 'employer') {
            $user->load('company');
        }

        return $this->success([
            'user' => new UserResource($user),
            'role' => $role,
            'seeker' => $role === 'seeker' ? [
                'headline' => $user->profile?->headline,
                'location' => $user->profile?->location,
                'summary' => $user->profile?->summary,
                'years_experience' => $user->profile?->years_experience,
            ] : null,
            'employer' => $role === 'employer' ? $user->company ? [
                'name' => $user->company->name,
                'slug' => $user->company->slug,
                'logo_text' => $user->company->logo_text,
                'logo_bg' => $user->company->logo_bg,
                'logo_color' => $user->company->logo_color,
                'verified' => $user->company->is_verified,
            ] : null : null,
        ], 'Authenticated.');
    }
}
