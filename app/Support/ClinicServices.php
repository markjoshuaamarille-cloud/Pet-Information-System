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
        $services = [];

        foreach (self::appointmentTypeLabels() as $code => $name) {
            $services[$code] = [
                'code' => $code,
                'name' => $name,
                'category' => 'appointment',
            ];
        }

        foreach (self::HEALTH_RECORD_TYPES as $type) {
            if (isset($services[$type])) {
                continue;
            }

            $services[$type] = [
                'code' => $type,
                'name' => self::label($type),
                'category' => 'health_record',
            ];
        }

        return array_values($services);
    }
}
