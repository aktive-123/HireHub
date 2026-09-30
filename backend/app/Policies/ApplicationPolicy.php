<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;

class ApplicationPolicy
{
    /**
     * An application is visible to the candidate who submitted it and to the
     * employer whose company posted the underlying job. Nothing else — this is
     * what stops one employer from reading another employer's applicants.
     */
    public function view(User $user, Application $application): bool
    {
        if ($application->seeker_id === $user->id) {
            return true;
        }

        return $this->employerOwnsJob($user, $application);
    }

    /**
     * Only the receiving employer advances a candidate through the pipeline.
     * The candidate cannot promote themselves.
     */
    public function updateStatus(User $user, Application $application): bool
    {
        return $this->employerOwnsJob($user, $application);
    }

    /**
     * CV access is deliberately narrow: only the company the candidate applied
     * to may retrieve it, and never via a public or cross-tenant identifier.
     */
    public function downloadCv(User $user, Application $application): bool
    {
        return $this->employerOwnsJob($user, $application);
    }

    private function employerOwnsJob(User $user, Application $application): bool
    {
        $companyId = $user->company?->id;

        if ($companyId === null) {
            return false;
        }

        $jobCompanyId = $application->relationLoaded('job')
            ? $application->job?->company_id
            : $application->job()->value('company_id');

        return $jobCompanyId !== null && (int) $jobCompanyId === (int) $companyId;
    }
}
