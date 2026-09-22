<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'group',
        'key',
        'value',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        [$group, $name] = array_pad(explode('.', $key, 2), 2, null);

        return static::query()
            ->where('group', $group)
            ->where('key', $name)
            ->value('value') ?? $default;
    }
}
