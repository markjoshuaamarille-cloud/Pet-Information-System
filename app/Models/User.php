<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'contact',
        'role',
        'is_active',
        'activated_at',
        'client_id',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'activated_at' => 'datetime',
        ];
    }

    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function isCustomer(): bool
    {
        return $this->hasRole('customer');
    }

    public function canSignIn(): bool
    {
        return $this->isCustomer() || $this->is_active;
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function clinics(): BelongsToMany
    {
        return $this->belongsToMany(Clinic::class, 'clinic_user')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    public function scopeAssignedToClinic(Builder $query, ?int $clinicId): Builder
    {
        if ($clinicId === null) {
            return $query;
        }

        return $query->whereHas('clinics', function (Builder $clinicQuery) use ($clinicId): void {
            $clinicQuery->where('clinics.id', $clinicId);
        });
    }

    public function isClinicOwner(): bool
    {
        return $this->hasRole('clinic_owner');
    }

    public function canManagePetRecords(): bool
    {
        if ($this->hasRole('cashier')) {
            return false;
        }

        return $this->isCustomer()
            || $this->hasAnyRole(['super_admin', 'veterinarian', 'receptionist', 'clinic_owner']);
    }

    public function canRegisterPet(): bool
    {
        return $this->isCustomer() || $this->isPlatformAdmin();
    }

    public function canManageHealthRecords(): bool
    {
        return $this->hasAnyRole(['super_admin', 'veterinarian', 'receptionist', 'clinic_owner']);
    }

    public function canManageVaccinationRecords(): bool
    {
        return $this->hasAnyRole(['super_admin', 'veterinarian', 'receptionist', 'clinic_owner']);
    }

    public function canManageGroomingRecords(): bool
    {
        return $this->hasAnyRole(['super_admin', 'groomer', 'receptionist', 'clinic_owner']);
    }

    public function canManageAppointmentStatus(): bool
    {
        return $this->hasAnyRole(['super_admin', 'veterinarian', 'receptionist', 'clinic_owner']);
    }

    public function isPlatformAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function isClinicAssignedStaff(): bool
    {
        if ($this->isPlatformAdmin() || $this->isCustomer()) {
            return false;
        }

        return $this->clinics()->exists();
    }

    public function hasActiveClinicAssignment(): bool
    {
        return $this->clinics()
            ->where('clinics.status', 'active')
            ->exists();
    }

    public function hasDeactivatedClinicOnly(): bool
    {
        return $this->isClinicAssignedStaff()
            && ! $this->hasActiveClinicAssignment();
    }

    public function requiresClinicRegistration(): bool
    {
        return $this->isClinicOwner() && ! $this->clinics()->exists();
    }

    public function postLoginRedirectUrl(): string
    {
        if ($this->requiresClinicRegistration()) {
            return route('clinic-registration.create', absolute: false);
        }

        return route('dashboard', absolute: false);
    }
}
