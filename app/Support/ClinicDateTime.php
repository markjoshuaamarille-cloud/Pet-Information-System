<?php

namespace App\Support;

use Carbon\Carbon;

class ClinicDateTime
{
    /**
     * Parse a datetime-local value or date string as clinic wall-clock time.
     */
    public static function parseScheduledAt(string $value): Carbon
    {
        $timezone = config('app.timezone');

        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $value)) {
            return Carbon::createFromFormat('Y-m-d\TH:i', $value, $timezone);
        }

        return Carbon::parse($value, $timezone);
    }
}
