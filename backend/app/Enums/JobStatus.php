<?php

namespace App\Enums;

enum JobStatus: string
{
    case Open = 'open';
    case Closed = 'closed';
    case Draft = 'draft';
    case Pending = 'pending';
    case Flagged = 'flagged';
    case Expired = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Live',
            self::Closed => 'Closed',
            self::Draft => 'Draft',
            self::Pending => 'Pending',
            self::Flagged => 'Flagged',
            self::Expired => 'Expired',
        };
    }
}
