<?php

namespace App\Policies;

use App\Models\Job;
use App\Models\User;

class JobPolicy
{
    /**
     * Employers may only manage postings that belong to their own company.
     * Admins are handled by the admin console routes, which are role-gated
     * separately, so they are intentionally not granted write access here.
     */
    public function update(User $user, Job $job): bool
    {
        return $this->ownsJob($user, $job);
    }

    public function delete(User $user, Job $job): bool
    {
        return $this->ownsJob($user, $job);
    }

    public function updateStatus(User $user, Job $job): bool
    {
        return $this->ownsJob($user, $job);
    }

    private function ownsJob(User $user, Job $job): bool
    {
        $companyId = $user->company?->id;

        return $companyId !== null && $job->company_id === $companyId;
    }
}
