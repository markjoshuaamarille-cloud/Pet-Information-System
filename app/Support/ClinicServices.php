<?php

namespace App\Support;

class ClinicServices
{
    public const APPOINTMENT_TYPES = [
        'checkup',
        'vaccination',
        'grooming',
        'consultation',
        'surgery',
        'boarding',
        'emergency_care',
        'other',
    ];

    public const HEALTH_RECORD_TYPES = [
        'consultation',
        'vaccination',
        'grooming',
        'medication',
        'surgery',
        'boarding',
        'emergency_care',
    ];

    public const VETERINARY_HEALTH_RECORD_TYPES = [
        'consultation',
        'vaccination',
        'medication',
        'surgery',
        'boarding',
        'emergency_care',
    ];

    public const VETERINARY_APPOINTMENT_TYPES = [
        'checkup',
        'vaccination',
        'consultation',
        'surgery',
        'boarding',
        'emergency_care',
        'other',
    ];

    public const SERVICE_CATALOG_CATEGORIES = [
        'consultation',
        'grooming',
        'surgery',
        'boarding',
        'emergency_care',
    ];

    /**
     * Appointment booking types allowed for a clinic based on services offered.
     *
     * @return list<string>
     */
    public static function appointmentTypesForClinic(?\App\Models\Clinic $clinic): array
    {
        if ($clinic === null) {
            return self::APPOINTMENT_TYPES;
        }

        $hasVet = (bool) $clinic->has_veterinary;
        $hasGrooming = (bool) $clinic->has_grooming;

        if ($hasGrooming && ! $hasVet) {
            return ['grooming'];
        }

        $types = $hasVet ? self::VETERINARY_APPOINTMENT_TYPES : [];

        if ($hasGrooming) {
            $types[] = 'grooming';
        }

        return array_values(array_unique($types));
    }

    /**
     * @return array<string, string>
     */
    public static function appointmentTypeLabelsForClinic(?\App\Models\Clinic $clinic): array
    {
        $labels = self::appointmentTypeLabels();
        $allowed = self::appointmentTypesForClinic($clinic);

        return array_intersect_key($labels, array_flip($allowed));
    }

    public static function appointmentTypeValidationRuleForClinic(?\App\Models\Clinic $clinic): string
    {
        $types = self::appointmentTypesForClinic($clinic);

        if ($types === []) {
            return self::appointmentTypeValidationRule();
        }

        return 'required|in:'.implode(',', $types);
    }

    /**
     * Service catalog categories shown when adding appointment services.
     *
     * @return list<string>
     */
    public static function serviceCatalogCategoriesForClinic(?\App\Models\Clinic $clinic): array
    {
        if ($clinic === null) {
            return self::SERVICE_CATALOG_CATEGORIES;
        }

        $hasVet = (bool) $clinic->has_veterinary;
        $hasGrooming = (bool) $clinic->has_grooming;

        if ($hasGrooming && ! $hasVet) {
            return ['grooming'];
        }

        $categories = $hasVet
            ? ['consultation', 'surgery', 'boarding', 'emergency_care']
            : [];

        if ($hasGrooming) {
            $categories[] = 'grooming';
        }

        return array_values(array_unique($categories));
    }

    /**
     * Health record types allowed for a clinic based on services offered.
     *
     * @return list<string>
     */
    public static function healthRecordTypesForClinic(?\App\Models\Clinic $clinic): array
    {
        if ($clinic === null) {
            return self::HEALTH_RECORD_TYPES;
        }

        $hasVet = (bool) $clinic->has_veterinary;
        $hasGrooming = (bool) $clinic->has_grooming;

        if ($hasGrooming && ! $hasVet) {
            return ['grooming'];
        }

        $types = $hasVet ? self::VETERINARY_HEALTH_RECORD_TYPES : [];

        if ($hasGrooming) {
            $types[] = 'grooming';
        }

        return array_values(array_unique($types));
    }

    public static function healthRecordTypeValidationRuleForClinic(?\App\Models\Clinic $clinic): string
    {
        $types = self::healthRecordTypesForClinic($clinic);

        if ($types === []) {
            return self::healthRecordTypeValidationRule();
        }

        return 'required|in:'.implode(',', $types);
    }

    /**
     * @return array<string, string>
     */
    public static function appointmentTypeLabels(): array
    {
        return [
            'checkup' => 'Checkup',
            'vaccination' => 'Vaccination',
            'grooming' => 'Grooming',
            'consultation' => 'Consultation',
            'surgery' => 'Surgery',
            'boarding' => 'Boarding / Hotel',
            'emergency_care' => 'Emergency Care',
            'other' => 'Other',
        ];
    }

    public static function appointmentTypeValidationRule(): string
    {
        return 'required|in:'.implode(',', self::APPOINTMENT_TYPES);
    }

    public static function healthRecordTypeValidationRule(): string
    {
        return 'required|in:'.implode(',', self::HEALTH_RECORD_TYPES);
    }

    public static function label(string $type): string
    {
        return self::appointmentTypeLabels()[$type] ?? ucfirst(str_replace('_', ' ', $type));
    }

    /**
     * Map a health-record type to its Service Catalog code.
     * Codes are seeded to match the type, so this is an identity map
     * with a fallback for safety.
     */
    public static function catalogCodeForType(string $type): string
    {
        $map = [
            'consultation' => 'consultation',
            'vaccination' => 'vaccination',
            'grooming' => 'grooming',
            'medication' => 'medication',
            'surgery' => 'surgery',
            'boarding' => 'boarding',
            'emergency_care' => 'emergency_care',
        ];

        return $map[$type] ?? $type;
    }

    /**
     * @return list<array{code: string, name: string, category: string}>
     */
    public static function catalogDefaults(): array
    {
        return [
            // General / checkup
            ['code' => 'checkup',      'name' => 'Checkup',       'category' => 'consultation'],
            ['code' => 'other',        'name' => 'Other Service', 'category' => 'general'],
            ['code' => 'laboratory',   'name' => 'Laboratory / Diagnostics', 'category' => 'general'],

            // Consultation
            ['code' => 'consultation', 'name' => 'Consultation', 'category' => 'consultation'],

            // Vaccination — general + variants
            ['code' => 'vaccination',            'name' => 'Vaccination (General)',  'category' => 'vaccination'],
            ['code' => 'vaccination_rabies',     'name' => 'Rabies Vaccine',         'category' => 'vaccination'],
            ['code' => 'vaccination_dhpp',       'name' => 'DHPP Combo Vaccine',     'category' => 'vaccination'],
            ['code' => 'vaccination_bordetella', 'name' => 'Bordetella Vaccine',     'category' => 'vaccination'],
            ['code' => 'vaccination_leptospira', 'name' => 'Leptospirosis Vaccine',  'category' => 'vaccination'],
            ['code' => 'vaccination_corona',     'name' => 'Coronavirus Vaccine',    'category' => 'vaccination'],
            ['code' => 'vaccination_5in1',       'name' => '5-in-1 Combo Vaccine',   'category' => 'vaccination'],

            // Grooming — general + size tiers + add-ons
            ['code' => 'grooming',               'name' => 'Grooming (General)',         'category' => 'grooming'],
            ['code' => 'grooming_bath_small',    'name' => 'Bath & Blow Dry (Small)',    'category' => 'grooming'],
            ['code' => 'grooming_bath_medium',   'name' => 'Bath & Blow Dry (Medium)',   'category' => 'grooming'],
            ['code' => 'grooming_bath_large',    'name' => 'Bath & Blow Dry (Large)',    'category' => 'grooming'],
            ['code' => 'grooming_nail_trim',     'name' => 'Nail Trim',                  'category' => 'grooming'],
            ['code' => 'grooming_ear_cleaning',  'name' => 'Ear Cleaning',               'category' => 'grooming'],
            ['code' => 'grooming_full_package',  'name' => 'Full Grooming Package',      'category' => 'grooming'],

            // Medication — general + common sub-types (no inventory deduction; use Pet records for dispensing)
            ['code' => 'medication',             'name' => 'Medication (General)',       'category' => 'medication'],
            ['code' => 'medication_antibiotic',  'name' => 'Antibiotic',                 'category' => 'medication'],
            ['code' => 'medication_dewormer',    'name' => 'Dewormer',                   'category' => 'medication'],
            ['code' => 'medication_supplement',  'name' => 'Supplement / Vitamin',       'category' => 'medication'],
            ['code' => 'medication_flea_tick',   'name' => 'Flea & Tick Treatment',      'category' => 'medication'],

            // Surgery — general + common procedures + consumables
            ['code' => 'surgery',                'name' => 'Surgery (General)',           'category' => 'surgery'],
            ['code' => 'surgery_spay',           'name' => 'Spay / OVH (Female)',         'category' => 'surgery'],
            ['code' => 'surgery_neuter',         'name' => 'Castration (Male)',            'category' => 'surgery'],
            ['code' => 'surgery_dental',         'name' => 'Dental Cleaning',              'category' => 'surgery'],
            ['code' => 'surgery_wound',          'name' => 'Wound Repair / Suture',        'category' => 'surgery'],
            ['code' => 'surgery_anesthesia',     'name' => 'Anesthesia',                   'category' => 'surgery'],
            ['code' => 'surgery_iv_fluids',      'name' => 'IV Fluids (Surgery)',           'category' => 'surgery'],

            // Boarding / Hotel — size tiers
            ['code' => 'boarding',               'name' => 'Boarding / Hotel (General)', 'category' => 'boarding'],
            ['code' => 'boarding_small',         'name' => 'Boarding — Small Pet',        'category' => 'boarding'],
            ['code' => 'boarding_medium',        'name' => 'Boarding — Medium Pet',       'category' => 'boarding'],
            ['code' => 'boarding_large',         'name' => 'Boarding — Large Pet',        'category' => 'boarding'],

            // Emergency Care
            ['code' => 'emergency_care',         'name' => 'Emergency Care (General)',    'category' => 'emergency_care'],
            ['code' => 'emergency_consultation', 'name' => 'Emergency Consultation',      'category' => 'emergency_care'],
            ['code' => 'emergency_oxygen',       'name' => 'Oxygen Therapy',              'category' => 'emergency_care'],
            ['code' => 'emergency_iv',           'name' => 'IV Fluid Therapy',            'category' => 'emergency_care'],
        ];
    }
}
