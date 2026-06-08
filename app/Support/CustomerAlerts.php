<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\HealthRecord;
use App\Models\Vaccination;
use Illuminate\Support\Carbon;

class CustomerAlerts
{
    private const HEALTH_CATEGORY_LABELS = [
        'vaccine' => 'Vaccine Due',
        'vaccination' => 'Vaccination Follow-up',
        'medication' => 'Medication Due',
        'consultation' => 'Consultation Follow-up',
        'grooming' => 'Grooming Due',
        'surgery' => 'Surgery Follow-up',
        'boarding' => 'Boarding Follow-up',
        'emergency_care' => 'Emergency Follow-up',
    ];

    private const APPOINTMENT_LABELS = [
        'checkup' => 'Checkup',
        'vaccination' => 'Vaccination',
        'grooming' => 'Grooming',
        'consultation' => 'Consultation',
        'surgery' => 'Surgery',
        'boarding' => 'Boarding / Hotel',
        'emergency_care' => 'Emergency Care',
        'other' => 'Other',
    ];

    /**
     * @return array{
     *     upcomingAppointments: list<array<string, mixed>>,
     *     healthMonitoring: list<array<string, mixed>>
     * }
     */
    public static function forClient(int $clientId, int $daysAhead = 30): array
    {
        return [
            'upcomingAppointments' => self::upcomingAppointments($clientId),
            'healthMonitoring' => self::healthMonitoring($clientId, $daysAhead),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function upcomingAppointments(int $clientId, int $limit = 15): array
    {
        return Appointment::with('pet')
            ->where('client_id', $clientId)
            ->where('status', 'scheduled')
            ->whereDate('scheduled_at', '>=', today())
            ->orderBy('scheduled_at')
            ->limit($limit)
            ->get()
            ->map(function (Appointment $appointment): array {
                $service = self::APPOINTMENT_LABELS[$appointment->type] ?? ucfirst($appointment->type);
                $scheduledAt = Carbon::parse($appointment->scheduled_at);
                $daysUntil = (int) now()->startOfDay()->diffInDays($scheduledAt->copy()->startOfDay(), false);

                return [
                    'id' => 'appointment-'.$appointment->id,
                    'type' => 'appointment',
                    'severity' => $daysUntil <= 1 ? 'warning' : 'info',
                    'title' => 'Upcoming Appointment',
                    'message' => sprintf(
                        '%s — %s on %s at %s.',
                        $appointment->pet?->pet_name ?? 'Your pet',
                        $service,
                        $scheduledAt->format('M j, Y'),
                        $scheduledAt->format('g:i A')
                    ),
                    'pet_id' => $appointment->pet_id,
                    'pet_name' => $appointment->pet?->pet_name,
                    'service' => $service,
                    'scheduled_at' => $scheduledAt->toIso8601String(),
                    'due_date' => $scheduledAt->toDateString(),
                    'status' => $appointment->status,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function healthMonitoring(int $clientId, int $daysAhead = 30, int $limit = 15): array
    {
        $items = collect();

        HealthRecord::with(['pet', 'medicine'])
            ->whereNotNull('next_due_date')
            ->whereDate('next_due_date', '<=', now()->addDays($daysAhead))
            ->whereHas('pet', fn ($query) => $query->where('client_id', $clientId))
            ->orderBy('next_due_date')
            ->get()
            ->each(function (HealthRecord $record) use ($items): void {
                $dueDate = Carbon::parse($record->next_due_date);
                $detail = $record->type === 'medication' && $record->medicine
                    ? $record->medicine->name
                    : null;

                $items->push([
                    'id' => 'health-'.$record->id,
                    'type' => $record->type.'_due',
                    'severity' => self::dueSeverity($dueDate),
                    'title' => self::HEALTH_CATEGORY_LABELS[$record->type] ?? 'Health Reminder',
                    'message' => self::healthDueMessage($record->pet?->pet_name, $record->title, $detail, $dueDate),
                    'pet_id' => $record->pet_id,
                    'pet_name' => $record->pet?->pet_name,
                    'category' => $record->type,
                    'detail' => $detail,
                    'due_date' => $dueDate->toDateString(),
                    'is_overdue' => $dueDate->isPast(),
                ]);
            });

        Vaccination::with('pet')
            ->whereNotNull('next_due_date')
            ->whereDate('next_due_date', '<=', now()->addDays($daysAhead))
            ->whereHas('pet', fn ($query) => $query->where('client_id', $clientId))
            ->orderBy('next_due_date')
            ->get()
            ->each(function (Vaccination $vaccination) use ($items): void {
                $dueDate = Carbon::parse($vaccination->next_due_date);

                $items->push([
                    'id' => 'vaccination-'.$vaccination->id,
                    'type' => 'vaccine_due',
                    'severity' => self::dueSeverity($dueDate),
                    'title' => self::HEALTH_CATEGORY_LABELS['vaccine'],
                    'message' => self::healthDueMessage(
                        $vaccination->pet?->pet_name,
                        $vaccination->vaccine_name,
                        $vaccination->dose,
                        $dueDate
                    ),
                    'pet_id' => $vaccination->pet_id,
                    'pet_name' => $vaccination->pet?->pet_name,
                    'category' => 'vaccine',
                    'detail' => $vaccination->dose,
                    'due_date' => $dueDate->toDateString(),
                    'is_overdue' => $dueDate->isPast(),
                ]);
            });

        return $items
            ->sortBy([
                fn (array $item) => match ($item['severity']) {
                    'danger' => 0,
                    'warning' => 1,
                    default => 2,
                },
                fn (array $item) => $item['due_date'] ?? '9999-12-31',
            ])
            ->take($limit)
            ->values()
            ->all();
    }

    private static function dueSeverity(Carbon $dueDate): string
    {
        if ($dueDate->isPast()) {
            return 'danger';
        }

        if ($dueDate->lte(now()->addDays(7))) {
            return 'warning';
        }

        return 'info';
    }

    private static function healthDueMessage(?string $petName, string $title, ?string $detail, Carbon $dueDate): string
    {
        $petLabel = $petName ?? 'Your pet';
        $detailSuffix = $detail ? " ({$detail})" : '';
        $dateLabel = $dueDate->isPast()
            ? 'was due on '.$dueDate->format('M j, Y')
            : 'is due on '.$dueDate->format('M j, Y');

        return "{$petLabel} — {$title}{$detailSuffix} {$dateLabel}.";
    }
}
