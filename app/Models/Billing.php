<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Billing extends Model
{
    use HasFactory, BelongsToClinic;

    protected static function booted(): void
    {
        static::deleting(function (Billing $billing): void {
            // Preserve invoiced status after billing_id is nulled by FK on delete.
            HealthRecord::query()
                ->where('billing_id', $billing->id)
                ->whereNull('invoiced_at')
                ->update(['invoiced_at' => now()]);
        });
    }

    protected $fillable = [
        'clinic_id',
        'invoice_number',
        'sale_type',
        'client_id',
        'pet_id',
        'appointment_id',
        'service_catalog_id',
        'service_unit_price',
        'service_quantity',
        'subtotal',
        'tax',
        'tax_applied',
        'tax_rate',
        'discount',
        'total_amount',
        'amount_paid',
        'status',
        'inventory_deducted',
        'due_date',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'service_unit_price' => 'decimal:2',
            'tax' => 'decimal:2',
            'tax_applied' => 'boolean',
            'tax_rate' => 'decimal:2',
            'discount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'inventory_deducted' => 'boolean',
            'service_quantity' => 'integer',
            'due_date' => 'date',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function serviceCatalog(): BelongsTo
    {
        return $this->belongsTo(ServiceCatalog::class);
    }

    public function healthRecords(): HasMany
    {
        return $this->hasMany(HealthRecord::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderByDesc('paid_at');
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(BillingLineItem::class);
    }

    public function isRetail(): bool
    {
        return $this->sale_type === 'pet_shop_retail';
    }
}
