<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceCatalog extends Model
{
    use HasFactory, BelongsToClinic;

    protected $table = 'service_catalogs';

    protected $fillable = [
        'clinic_id',
        'code',
        'name',
        'category',
        'default_price',
    ];

    protected function casts(): array
    {
        return [
            'default_price' => 'decimal:2',
        ];
    }

    public function billings(): HasMany
    {
        return $this->hasMany(Billing::class);
    }
}
