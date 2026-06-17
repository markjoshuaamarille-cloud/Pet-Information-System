<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'contact',
        'email',
        'address',
        'address_line1',
        'address_line2',
        'barangay',
        'city',
        'province',
        'postal_code',
        'country',
        'latitude',
        'longitude',
        'address_formatted',
    ];

    protected $casts = [
        'latitude'  => 'float',
        'longitude' => 'float',
    ];

    public function pets(): HasMany
    {
        return $this->hasMany(Pet::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function billings(): HasMany
    {
        return $this->hasMany(Billing::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function effectiveContact(): ?string
    {
        $contact = trim((string) ($this->contact ?? ''));

        if ($contact !== '' && strcasecmp($contact, 'N/A') !== 0) {
            return $contact;
        }

        $userContact = $this->users()
            ->whereNotNull('contact')
            ->where('contact', '!=', '')
            ->whereRaw('UPPER(TRIM(contact)) != ?', ['N/A'])
            ->value('contact');

        return $userContact ? trim($userContact) : null;
    }
}
