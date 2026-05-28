<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class HealthRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'medicine_id',
        'type',
        'title',
        'description',
        'dosage',
        'medication_quantity',
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
        ];
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
}
