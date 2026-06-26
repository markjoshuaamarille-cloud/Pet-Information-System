<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;

class GroomingSlotAvailability
{
    public const SLOT_DURATION_MINUTES = 90;

    public const MAX_LOOKAHEAD_HOURS = 24 * 14;

    public static function groomerCount(int $clinicId): int
    {
        return User::query()
            ->where('role', 'groomer')
            ->where('is_active', true)
            ->whereHas('clinics', fn ($query) => $query
                ->where('clinics.id', $clinicId)
                ->where('clinics.status', 'active'))
            ->count();
    }

    public static function overlapsSlot(Carbon $appointmentStart, Carbon $slotStart): bool
    {
        $appointmentEnd = $appointmentStart->copy()->addMinutes(self::SLOT_DURATION_MINUTES);
        $slotEnd = $slotStart->copy()->addMinutes(self::SLOT_DURATION_MINUTES);

        return $appointmentStart->lt($slotEnd) && $appointmentEnd->gt($slotStart);
    }

    /**
     * @return Collection<int, Appointment>
     */
    public static function scheduledGroomingAppointmentsForDay(
        int $clinicId,
        Carbon $day,
        ?int $excludeAppointmentId = null,
    ): Collection {
        return Appointment::query()
            ->where('clinic_id', $clinicId)
            ->where('type', 'grooming')
            ->where('status', 'scheduled')
            ->whereBetween('scheduled_at', [
                $day->copy()->startOfDay(),
                $day->copy()->endOfDay(),
            ])
            ->when($excludeAppointmentId, fn ($query) => $query->where('id', '!=', $excludeAppointmentId))
            ->get(['id', 'scheduled_at']);
    }

    public static function bookedCount(int $clinicId, Carbon $scheduledAt, ?int $excludeAppointmentId = null): int
    {
        return self::scheduledGroomingAppointmentsForDay($clinicId, $scheduledAt, $excludeAppointmentId)
            ->filter(fn (Appointment $appointment) => self::overlapsSlot(
                Date::parse($appointment->scheduled_at),
                $scheduledAt,
            ))
            ->count();
    }

    public static function isAvailable(int $clinicId, Carbon $scheduledAt, ?int $excludeAppointmentId = null): bool
    {
        $capacity = self::groomerCount($clinicId);

        if ($capacity === 0) {
            return false;
        }

        return self::bookedCount($clinicId, $scheduledAt, $excludeAppointmentId) < $capacity;
    }

    public static function nextAvailableSlot(
        int $clinicId,
        Carbon $requestedAt,
        ?int $excludeAppointmentId = null,
    ): ?Carbon {
        $searchFrom = $requestedAt->copy();
        $lastDay = $requestedAt->copy()->addHours(self::MAX_LOOKAHEAD_HOURS)->startOfDay();

        for ($day = $searchFrom->copy()->startOfDay(); $day->lte($lastDay); $day->addDay()) {
            $slot = self::nextAvailableSlotOnDay(
                $clinicId,
                $day,
                $searchFrom,
                $excludeAppointmentId,
            );

            if ($slot) {
                return $slot;
            }

            $searchFrom = $day->copy()->addDay()->startOfDay();
        }

        return null;
    }

    private static function nextAvailableSlotOnDay(
        int $clinicId,
        Carbon $day,
        Carbon $searchFrom,
        ?int $excludeAppointmentId = null,
    ): ?Carbon {
        $dayStart = $day->copy()->startOfDay();
        $dayEnd = $day->copy()->endOfDay();
        $earliest = $searchFrom->greaterThan($dayStart) ? $searchFrom->copy() : $dayStart->copy();

        if ($earliest->gt($dayEnd)) {
            return null;
        }

        $candidates = collect([$earliest]);

        foreach (self::scheduledGroomingAppointmentsForDay($clinicId, $day, $excludeAppointmentId) as $appointment) {
            $appointmentEnd = Date::parse($appointment->scheduled_at)
                ->addMinutes(self::SLOT_DURATION_MINUTES);

            if ($appointmentEnd->gte($earliest) && $appointmentEnd->lte($dayEnd)) {
                $candidates->push($appointmentEnd->copy());
            }
        }

        return $candidates
            ->map(fn (Carbon $candidate) => $candidate->copy())
            ->unique(fn (Carbon $candidate) => $candidate->format('Y-m-d H:i:s'))
            ->sort()
            ->first(fn (Carbon $candidate) => $candidate->gte($earliest)
                && self::isAvailable($clinicId, $candidate, $excludeAppointmentId));
    }

    /**
     * @return array{
     *     available: bool,
     *     groomer_count: int,
     *     booked_count: int,
     *     remaining_slots: int,
     *     next_available_at: ?string,
     *     next_available_formatted: ?string,
     *     message: ?string
     * }
     */
    public static function inspect(int $clinicId, Carbon $scheduledAt, ?int $excludeAppointmentId = null): array
    {
        $groomerCount = self::groomerCount($clinicId);
        $bookedCount = self::bookedCount($clinicId, $scheduledAt, $excludeAppointmentId);
        $available = $groomerCount > 0 && $bookedCount < $groomerCount;

        $nextSlot = $available
            ? null
            : self::nextAvailableSlot($clinicId, $scheduledAt, $excludeAppointmentId);

        $message = null;

        if ($groomerCount === 0) {
            $message = 'This grooming salon has no active groomers available for booking.';
        } elseif (! $available) {
            $message = $nextSlot
                ? 'All groomers are booked for this 1.5-hour window. Next available slot is '
                    .self::formatSlot($nextSlot).'.'
                : 'All groomers are booked for this 1.5-hour window and no nearby slots were found.';
        }

        return [
            'available' => $available,
            'groomer_count' => $groomerCount,
            'booked_count' => $bookedCount,
            'remaining_slots' => max(0, $groomerCount - $bookedCount),
            'next_available_at' => $nextSlot?->format('Y-m-d\TH:i'),
            'next_available_formatted' => $nextSlot ? self::formatSlot($nextSlot) : null,
            'message' => $message,
        ];
    }

    public static function formatSlot(Carbon $slot): string
    {
        return Date::parse($slot)
            ->timezone(config('app.timezone'))
            ->format('M j, Y g:i A');
    }

    public static function validationMessage(int $clinicId, Carbon $scheduledAt, ?int $excludeAppointmentId = null): ?string
    {
        return self::inspect($clinicId, $scheduledAt, $excludeAppointmentId)['message'];
    }
}
