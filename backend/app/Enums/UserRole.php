<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Employer = 'employer';
    case Seeker = 'seeker';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::Employer => 'Employer',
            self::Seeker => 'Job Seeker',
        };
    }
}
