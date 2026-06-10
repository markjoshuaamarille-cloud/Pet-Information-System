<?php

namespace App\Models;

use App\Support\ServiceCatalogDefaults;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Clinic extends Model
{
    use HasFactory;

    public const ALL_MODULES = [
        'dashboard',
        'scheduling',
        'vaccinations',
        'grooming',
        'pet_shop',
        'pet_shop_billing',
        'inventory',
        'service_catalog',
        'pets',
        'reports',
        'notifications',
        'billing',
    ];

    protected $fillable = [
        'name',
        'slug',
        'contact',
        'email',
        'website',
        'address',
        'address_line1',
        'address_line2',
        'barangay',
        'city',
        'province',
        'postal_code',
        'country',
        'address_formatted',
        'latitude',
        'longitude',
        'geoapify_place_id',
        'geoapify_label',
        'has_veterinary',
        'has_pet_shop',
        'has_grooming',
        'enabled_modules',
        'status',
        'submitted_by_user_id',
        'approved_by_user_id',
        'approved_at',
    ];

    protected $casts = [
        'has_veterinary'   => 'boolean',
        'has_pet_shop'     => 'boolean',
        'has_grooming'     => 'boolean',
        'enabled_modules'  => 'array',
        'approved_at'      => 'datetime',
        'latitude'         => 'float',
        'longitude'        => 'float',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Clinic $clinic): void {
            if (empty($clinic->slug)) {
                $clinic->slug = Str::slug($clinic->name);
            }
        });

        static::created(function (Clinic $clinic): void {
            ServiceCatalogDefaults::seedForClinic($clinic->id);
        });
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'clinic_user')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function medicines(): HasMany
    {
        return $this->hasMany(Medicine::class);
    }

    public function billings(): HasMany
    {
        return $this->hasMany(Billing::class);
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function isOperational(): bool
    {
        return $this->status === 'active';
    }

    public function scopeWithPetShop(Builder $query): Builder
    {
        return $query->where('has_pet_shop', true);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function hasModule(string $module): bool
    {
        return in_array($module, $this->enabled_modules ?? [], true);
    }

    /**
     * Return the default enabled modules based on service capability flags.
     */
    public static function defaultModulesForFlags(bool $vet, bool $petShop, bool $grooming): array
    {
        $modules = ['dashboard', 'pets', 'notifications'];

        if ($vet) {
            array_push($modules, 'scheduling', 'vaccinations', 'inventory', 'service_catalog', 'billing', 'reports');
        }

        if ($grooming) {
            $modules[] = 'grooming';
        }

        if ($petShop) {
            array_push($modules, 'pet_shop', 'pet_shop_billing', 'inventory');
        }

        return array_unique($modules);
    }
}
