<?php

namespace App\Models;

use App\Support\ServiceCatalogDefaults;
use App\Support\ClinicRegistrationDocuments;
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
        'barangay_clearance_path',
        'business_permit_path',
        'other_requirements',
        'approved_by_user_id',
        'approved_at',
    ];

    protected $appends = [
        'registration_documents',
    ];

    protected $casts = [
        'has_veterinary'   => 'boolean',
        'has_pet_shop'     => 'boolean',
        'has_grooming'     => 'boolean',
        'enabled_modules'  => 'array',
        'other_requirements' => 'array',
        'approved_at'      => 'datetime',
        'latitude'         => 'float',
        'longitude'        => 'float',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Clinic $clinic): void {
            if (empty($clinic->slug)) {
                $clinic->slug = static::generateUniqueSlug(
                    $clinic->name,
                    [
                        'city' => $clinic->city,
                        'barangay' => $clinic->barangay,
                        'address_line1' => $clinic->address_line1,
                        'address_formatted' => $clinic->address_formatted,
                    ],
                );
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
     * @return list<array{key: string, label: string, url: string|null, required: bool}>
     */
    public function getRegistrationDocumentsAttribute(): array
    {
        $documents = [];

        if ($this->barangay_clearance_path) {
            $documents[] = [
                'key' => 'barangay_clearance',
                'label' => 'Barangay Clearance',
                'url' => self::temporaryDocumentUrl($this->barangay_clearance_path),
                'required' => true,
            ];
        }

        if ($this->business_permit_path) {
            $documents[] = [
                'key' => 'business_permit',
                'label' => "Mayor's Permit / Business Permit (BPLO)",
                'url' => self::temporaryDocumentUrl($this->business_permit_path),
                'required' => true,
            ];
        }

        foreach ($this->other_requirements ?? [] as $index => $item) {
            if (empty($item['path'])) {
                continue;
            }

            $documents[] = [
                'key' => 'other_'.$index,
                'label' => (string) ($item['label'] ?? 'Other requirement'),
                'url' => self::temporaryDocumentUrl($item['path'] ?? null),
                'required' => false,
            ];
        }

        return $documents;
    }

    private static function temporaryDocumentUrl(?string $path): ?string
    {
        return ClinicRegistrationDocuments::url($path);
    }

    /**
     * Build a unique slug from the clinic name, adding location when needed.
     */
    public static function generateUniqueSlug(string $name, array $location = [], ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'clinic';

        $locationParts = array_values(array_filter([
            $location['barangay'] ?? null,
            $location['city'] ?? null,
            $location['address_line1'] ?? null,
        ], fn (?string $part) => filled($part)));

        $candidates = [$base];

        if ($locationParts !== []) {
            $candidates[] = $base.'-'.Str::slug(implode('-', $locationParts));
        }

        foreach (array_slice($locationParts, 0, 2) as $part) {
            $candidates[] = $base.'-'.Str::slug($part);
        }

        $candidates = array_values(array_unique(array_filter($candidates)));

        foreach ($candidates as $candidate) {
            if (! static::slugExists($candidate, $ignoreId)) {
                return $candidate;
            }
        }

        $suffix = 2;

        while (static::slugExists("{$base}-{$suffix}", $ignoreId)) {
            $suffix++;
        }

        return "{$base}-{$suffix}";
    }

    private static function slugExists(string $slug, ?int $ignoreId = null): bool
    {
        return static::query()
            ->when($ignoreId, fn (Builder $query) => $query->where('id', '!=', $ignoreId))
            ->where('slug', $slug)
            ->exists();
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
