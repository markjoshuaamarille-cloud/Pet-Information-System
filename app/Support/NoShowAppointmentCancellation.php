<?php

namespace App\Support;

use App\Models\Appointment;
use Carbon\Carbon;

class NoShowAppointmentCancellation
{
    public const AUTO_CANCEL_NOTE = '[Auto-cancelled: no-show — did not attend on appointment day]';

    public static function clinicTimezone(): string
    {
        return (string) config('app.timezone', 'Asia/Manila');
    }

    /**
     * First moment after the appointment calendar day (clinic timezone).
     */
    public static function cancellationDeadline(Appointment $appointment): Carbon
    {
        return $appointment->scheduled_at
            ->copy()
            ->timezone(self::clinicTimezone())
            ->startOfDay()
            ->addDay();
    }

    public static function isDueForCancellation(Appointment $appointment, ?Carbon $now = null): bool
    {
        if ($appointment->status !== 'scheduled') {
            return false;
        }

        $now ??= now(self::clinicTimezone());

        return $now->greaterThanOrEqualTo(self::cancellationDeadline($appointment));
    }

    /**
     * Cancel scheduled appointments that were not attended by end of appointment day.
     */
    public static function cancelDueAppointments(?Carbon $now = null): int
    {
        $now ??= now(self::clinicTimezone());
        $cancelled = 0;

        Appointment::query()
            ->where('status', 'scheduled')
            ->where('scheduled_at', '<', $now)
            ->orderBy('id')
            ->chunkById(100, function ($appointments) use ($now, &$cancelled): void {
                foreach ($appointments as $appointment) {
                    if (! self::isDueForCancellation($appointment, $now)) {
                        continue;
                    }

                    $appointment->update([
                        'status' => 'cancelled',
                        'notes' => self::appendAutoCancelNote($appointment->notes),
                    ]);

                    $cancelled++;
                }
            });

        return $cancelled;
    }

    public static function appendAutoCancelNote(?string $existingNotes): string
    {
        $notes = trim((string) $existingNotes);

        if ($notes === '') {
            return self::AUTO_CANCEL_NOTE;
        }

        if (str_contains($notes, self::AUTO_CANCEL_NOTE)) {
            return $notes;
        }

        return self::AUTO_CANCEL_NOTE.' '.$notes;
    }
}
