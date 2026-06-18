<?php

namespace App\Support;

use App\Models\Appointment;
use Carbon\Carbon;

class NoShowAppointmentCancellation
{
    public const GROOMING_GRACE_HOURS = 6;

    public const DEFAULT_GRACE_HOURS = 24;

    public const AUTO_CANCEL_NOTE = '[Auto-cancelled: no-show]';

    public static function gracePeriodHours(string $appointmentType): int
    {
        return $appointmentType === 'grooming'
            ? self::GROOMING_GRACE_HOURS
            : self::DEFAULT_GRACE_HOURS;
    }

    public static function cancellationDeadline(Appointment $appointment): Carbon
    {
        return $appointment->scheduled_at->copy()->addHours(
            self::gracePeriodHours($appointment->type),
        );
    }

    public static function isDueForCancellation(Appointment $appointment, ?Carbon $now = null): bool
    {
        if ($appointment->status !== 'scheduled') {
            return false;
        }

        $now ??= now();

        return $now->greaterThanOrEqualTo(self::cancellationDeadline($appointment));
    }

    /**
     * Cancel scheduled appointments that passed their no-show grace period.
     */
    public static function cancelDueAppointments(?Carbon $now = null): int
    {
        $now ??= now();
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
