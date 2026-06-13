<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class HealthRecord extends Model
{
    use HasFactory, BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'pet_id',
        'medicine_id',
        'service_catalog_id',
        'billing_id',
        'invoiced_at',
        'appointment_id',
        'type',
        'title',
        'description',
        'dosage',
        'medication_quantity',
        'unit_price',
        'quantity',
        'line_total',
        'record_date',
        'next_due_date',
        'veterinarian_notes',
        'sticker_photo_path',
    ];

    protected $appends = [
        'sticker_photo_url',
    ];

    protected function casts(): array
    {
        return [
            'record_date' => 'date',
            'next_due_date' => 'date',
            'unit_price' => 'decimal:2',
            'quantity' => 'integer',
            'line_total' => 'decimal:2',
            'invoiced_at' => 'datetime',
        ];
    }

    public function scopeBillableForCheckout(Builder $query): Builder
    {
        return $query
            ->whereNull('invoiced_at')
            ->where('line_total', '>', 0);
    }

    protected static function booted(): void
    {
        static::saving(function (HealthRecord $record): void {
            if ($record->billing_id && ! $record->invoiced_at) {
                $record->invoiced_at = now();
            }
        });
    }

    public function getStickerPhotoUrlAttribute(): ?string
    {
        if (! $this->sticker_photo_path || $this->sticker_photo_path === '0') {
            return null;
        }

        try {
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('s3');

            return $disk->temporaryUrl($this->sticker_photo_path, now()->addHour());
        } catch (\Throwable) {
            return null;
        }
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    public function serviceCatalog(): BelongsTo
    {
        return $this->belongsTo(ServiceCatalog::class);
    }

    public function billing(): BelongsTo
    {
        return $this->belongsTo(Billing::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
