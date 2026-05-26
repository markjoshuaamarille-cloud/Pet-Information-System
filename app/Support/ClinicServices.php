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
}
