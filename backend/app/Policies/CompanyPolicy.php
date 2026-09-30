<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

class CompanyPolicy
{
    public function update(User $user, Company $company): bool
    {
        return $user->company?->id === $company->id;
    }

    public function delete(User $user, Company $company): bool
    {
        return $user->company?->id === $company->id;
    }
}
