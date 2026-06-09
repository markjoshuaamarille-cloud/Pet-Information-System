<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Medicine extends Model
{
    use HasFactory, BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'name',
        'category',
        'description',
        'image_path',
        'quantity',
        'unit',
        'unit_price',
        'expiry_date',
        'reorder_level',
        'is_active',
    ];

    protected $appends = [
        'image_url',
    ];

    protected function casts(): array
    {
        return [
            'expiry_date' => 'date',
            'unit_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function scopeSellable(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function healthRecords(): HasMany
    {
        return $this->hasMany(HealthRecord::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        try {
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('s3');

            return $disk->temporaryUrl($this->image_path, now()->addHour());
        } catch (\Throwable) {
            return null;
        }
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
