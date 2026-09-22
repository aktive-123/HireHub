<?php

namespace App\Enums;

enum WorkplaceType: string
{
    case Remote = 'remote';
    case OnSite = 'on-site';
    case Hybrid = 'hybrid';

    public function label(): string
    {
        return match ($this) {
            self::Remote => 'Remote',
            self::OnSite => 'On-site',
            self::Hybrid => 'Hybrid',
        };
    }
}
