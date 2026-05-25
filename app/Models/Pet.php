<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Pet extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'pet_name',
        'species',
        'breed',
        'age',
        'gender',
        'birth_date',
        'weight',
        'color',
        'microchip_no',
        'vaccination_status',
        'photo_path',
        'medical_history',
    ];

    protected $appends = [
        'photo_url',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'weight' => 'decimal:2',
        ];
    }

    public function getPhotoUrlAttribute(): ?string
    {
        if (! $this->photo_path) {
            return null;
        }

        try {
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('s3');

            return $disk->temporaryUrl($this->photo_path, now()->addHour());
        } catch (\Throwable) {
            return null;
        }
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function healthRecords(): HasMany
    {
        return $this->hasMany(HealthRecord::class)->orderByDesc('record_date');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(Vaccination::class)->orderByDesc('administered_on');
    }

    public function groomingRecords(): HasMany
    {
        return $this->hasMany(GroomingRecord::class)->orderByDesc('service_date');
    }

    public function billings(): HasMany
    {
        return $this->hasMany(Billing::class)->orderByDesc('created_at');
    }
}
