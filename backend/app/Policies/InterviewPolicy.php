<?php

namespace App\Policies;

use App\Models\Interview;
use App\Models\User;

class InterviewPolicy
{
    public function view(User $user, Interview $interview): bool
    {
        return $this->employerOwnsInterview($user, $interview);
    }

    public function update(User $user, Interview $interview): bool
    {
        return $this->employerOwnsInterview($user, $interview);
    }

    public function updateStatus(User $user, Interview $interview): bool
    {
        return $this->employerOwnsInterview($user, $interview);
    }

    public function delete(User $user, Interview $interview): bool
    {
        return $this->employerOwnsInterview($user, $interview);
    }

    private function employerOwnsInterview(User $user, Interview $interview): bool
    {
        $companyId = $user->company?->id;

        return $companyId !== null && $interview->company_id === $companyId;
    }
}
