<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Date;

class GroomingSlotAvailability
{
    public const SLOT_DURATION_MINUTES = 60;

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

    public static function bookedCount(int $clinicId, Carbon $scheduledAt, ?int $excludeAppointmentId = null): int
    {
        return Appointment::query()
            ->where('clinic_id', $clinicId)
            ->where('type', 'grooming')
            ->where('status', 'scheduled')
            ->where('scheduled_at', $scheduledAt)
            ->when($excludeAppointmentId, fn ($query) => $query->where('id', '!=', $excludeAppointmentId))
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
        $cursor = $requestedAt->copy();

        for ($attempt = 0; $attempt < self::MAX_LOOKAHEAD_HOURS; $attempt++) {
            if (self::isAvailable($clinicId, $cursor, $excludeAppointmentId)) {
                return $cursor;
            }

            $cursor = $cursor->copy()->addMinutes(self::SLOT_DURATION_MINUTES);
        }

        return null;
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
                ? 'This time slot is fully booked. Next available slot is '
                    .self::formatSlot($nextSlot).'.'
                : 'This time slot is fully booked and no nearby slots were found.';
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
