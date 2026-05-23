<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medicine extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'description',
        'quantity',
        'unit',
        'expiry_date',
        'reorder_level',
    ];

    protected function casts(): array
    {
        return [
            'expiry_date' => 'date',
        ];
    }

    public function healthRecords(): HasMany
    {
        return $this->hasMany(HealthRecord::class);
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->whereDate('expiry_date', '<', now()->toDateString());
    }

    public function scopeExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query->whereBetween('expiry_date', [now()->toDateString(), now()->addDays($days)->toDateString()]);
    }

    public function scopeCriticalStock(Builder $query): Builder
    {
        return $query->whereColumn('quantity', '<=', 'reorder_level');
    }

    public function isExpired(): bool
    {
        return $this->expiry_date->isPast();
    }

    public function isCriticalStock(): bool
    {
        return $this->quantity <= $this->reorder_level;
    }

    public function stockStatus(): string
    {
        if ($this->isExpired()) {
            return 'expired';
        }

        if ($this->isCriticalStock()) {
            return 'critical';
        }

        if ($this->expiry_date->lte(now()->addDays(30))) {
            return 'expiring_soon';
        }

        return 'ok';
    }
}
