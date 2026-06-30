<?php

namespace App\Support;

use App\Models\Appointment;

class AppointmentCancellationNotes
{
    public const SELF_CANCEL_NOTE = '[Cancelled by customer]';

    public const STAFF_CANCEL_NOTE = '[Cancelled by clinic staff]';

    public static function appendSelfCancelNote(?string $existingNotes): string
    {
        return self::appendNote($existingNotes, self::SELF_CANCEL_NOTE);
    }

    public static function appendStaffCancelNote(?string $existingNotes): string
    {
        return self::appendNote($existingNotes, self::STAFF_CANCEL_NOTE);
    }

    public static function resolveCancellationReason(Appointment $appointment): ?string
    {
        if ($appointment->status !== 'cancelled') {
            return null;
        }

        $notes = (string) $appointment->notes;

        if (str_contains($notes, NoShowAppointmentCancellation::AUTO_CANCEL_NOTE)) {
            return 'no_show';
        }

        if (str_contains($notes, self::SELF_CANCEL_NOTE)) {
            return 'self_cancelled';
        }

        if (str_contains($notes, self::STAFF_CANCEL_NOTE)) {
            return 'staff_cancelled';
        }

        return 'manual';
    }

    public static function isSelfCancelled(Appointment $appointment): bool
    {
        return self::resolveCancellationReason($appointment) === 'self_cancelled';
    }

    private static function appendNote(?string $existingNotes, string $note): string
    {
        $notes = trim((string) $existingNotes);

        if ($notes === '') {
            return $note;
        }

        if (str_contains($notes, $note)) {
            return $notes;
        }

        return $note.' '.$notes;
    }
}
