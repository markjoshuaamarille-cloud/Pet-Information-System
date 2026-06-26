<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = [
        'default_commission_rate',
    ];

    protected function casts(): array
    {
        return [
            'default_commission_rate' => 'decimal:2',
        ];
    }

    public static function commissionRate(): float
    {
        $settings = static::query()->first();

        return (float) ($settings?->default_commission_rate ?? 20.0);
    }

    public static function updateCommissionRate(float $rate): void
    {
        $settings = static::query()->first();

        if ($settings) {
            $settings->update(['default_commission_rate' => $rate]);

            return;
        }

        static::query()->create(['default_commission_rate' => $rate]);
    }
}
