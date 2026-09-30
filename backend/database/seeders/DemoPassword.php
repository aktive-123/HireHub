<?php

namespace Database\Seeders;

use Illuminate\Support\Facades\Hash;

/**
 * Password for the demo accounts the seeders create.
 *
 * Centralised so no seeder hardcodes a credential. The development default is
 * documented and expected; any deployed environment sets SEED_DEMO_PASSWORD so
 * the seeded accounts are not reachable with a password published on GitHub.
 */
final class DemoPassword
{
    public static function hash(): string
    {
        return Hash::make(self::plain());
    }

    public static function plain(): string
    {
        $configured = env('SEED_DEMO_PASSWORD');

        return is_string($configured) && $configured !== '' ? $configured : 'password';
    }
}
