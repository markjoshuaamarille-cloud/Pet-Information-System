<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Appointment extends Model
{
    use HasFactory, BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'pet_id',
        'client_id',
        'scheduled_at',
        'type',
        'status',
        'billing_status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
        ];
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function billings(): HasMany
    {
        return $this->hasMany(Billing::class);
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(Vaccination::class);
    }

    public function healthRecords(): HasMany
    {
        return $this->hasMany(HealthRecord::class);
    }

    public function rating(): HasOne
    {
        return $this->hasOne(AppointmentRating::class);
    }
}
