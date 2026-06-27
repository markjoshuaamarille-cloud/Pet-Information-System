<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformCommission extends Model
{
    protected $fillable = [
        'payment_id',
        'billing_id',
        'clinic_id',
        'settlement_id',
        'invoice_number',
        'sale_type',
        'business_line',
        'transaction_amount',
        'commission_rate',
        'commission_amount',
        'business_earnings',
        'transaction_at',
    ];

    protected function casts(): array
    {
        return [
            'transaction_amount' => 'decimal:2',
            'commission_rate' => 'decimal:2',
            'commission_amount' => 'decimal:2',
            'business_earnings' => 'decimal:2',
            'transaction_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function billing(): BelongsTo
    {
        return $this->belongsTo(Billing::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(PlatformCommissionSettlement::class, 'settlement_id');
    }

    public function businessLineLabel(): string
    {
        return match ($this->business_line) {
            'pet_shop' => 'Pet Shop',
            'grooming' => 'Grooming',
            default => 'Veterinary Clinic',
        };
    }
}
