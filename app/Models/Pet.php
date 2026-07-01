<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
        'pcci_reg_no',
        'pcci_certificate_path',
        'vaccination_status',
        'photo_path',
        'medical_history',
        'is_active',
        'deactivated_at',
    ];

    protected $appends = [
        'photo_url',
        'pcci_certificate_url',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'weight' => 'decimal:2',
            'is_active' => 'boolean',
            'deactivated_at' => 'datetime',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public static function purgeDeactivatedBeyondOneYear(): int
    {
        $pets = self::query()
            ->where('is_active', false)
            ->whereNotNull('deactivated_at')
            ->where('deactivated_at', '<=', now()->subYear())
            ->get();

        $purged = 0;

        foreach ($pets as $pet) {
            if ($pet->photo_path) {
                Storage::disk('s3')->delete($pet->photo_path);
            }

            if ($pet->pcci_certificate_path) {
                Storage::disk('s3')->delete($pet->pcci_certificate_path);
            }

            $pet->delete();
            $purged++;
        }

        return $purged;
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->temporaryStorageUrl($this->photo_path);
    }

    public function getPcciCertificateUrlAttribute(): ?string
    {
        return $this->temporaryStorageUrl($this->pcci_certificate_path);
    }

    private function temporaryStorageUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        try {
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('s3');

            return $disk->temporaryUrl($path, now()->addHour());
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
        return $this->hasMany(HealthRecord::class)
            ->orderByDesc('record_date')
            ->orderByDesc('id');
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
