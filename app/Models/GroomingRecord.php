<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroomingRecord extends Model
{
    use HasFactory, BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'pet_id',
        'appointment_id',
        'groomer_id',
        'service_type',
        'service_date',
        'price',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
            'price' => 'decimal:2',
        ];
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function groomer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'groomer_id');
    }
}
