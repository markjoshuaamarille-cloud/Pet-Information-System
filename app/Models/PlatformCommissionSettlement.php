<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlatformCommissionSettlement extends Model
{
    protected $fillable = [
        'clinic_id',
        'receipt_number',
        'period_start',
        'period_end',
        'transaction_count',
        'total_gross',
        'total_commission',
        'total_business_earnings',
        'amount_received',
        'payment_method',
        'reference_number',
        'notes',
        'paid_at',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'total_gross' => 'decimal:2',
            'total_commission' => 'decimal:2',
            'total_business_earnings' => 'decimal:2',
            'amount_received' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(PlatformCommission::class, 'settlement_id');
    }
}
