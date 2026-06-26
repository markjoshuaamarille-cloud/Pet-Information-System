<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\HealthRecord;
use App\Models\SystemNotification;
use App\Models\User;
use App\Models\Vaccination;
use App\Support\PlatformAdminNotifier;
use App\Support\StaffNotificationBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
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

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $user = $user instanceof User ? $user : null;
        $clinicId = $request->attributes->get('active_clinic_id');
        $isPlatformAdmin = (bool) $user?->isPlatformAdmin();

        if ($user?->isCustomer()) {
            $notifications = $user->client_id
                ? $this->customerNotifications((int) $user->client_id)
                : [];

            return Inertia::render('Notifications/Index', [
                'notifications' => $notifications,
                'isCustomer' => true,
            ]);
        }

        return Inertia::render('Notifications/Index', [
            'notifications' => StaffNotificationBuilder::build($clinicId, $isPlatformAdmin)->all(),
            'isCustomer' => false,
            'platformAdminAlerts' => $isPlatformAdmin ? PlatformAdminNotifier::pendingSummary() : null,
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function staffNotificationsForRequest(Request $request): array
    {
        $user = $request->user();
        $user = $user instanceof User ? $user : null;
        $clinicId = $request->attributes->get('active_clinic_id');
        $isPlatformAdmin = (bool) $user?->isPlatformAdmin();

        return StaffNotificationBuilder::build($clinicId, $isPlatformAdmin)->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function customerNotifications(int $clientId, int $daysAhead = 30): array
    {
        $items = collect();

        SystemNotification::query()
            ->where('client_id', $clientId)
            ->latest()
            ->limit(20)
            ->get()
            ->each(function (SystemNotification $notification) use ($items): void {
                $items->push([
                    'id' => 'system-'.$notification->id,
                    'type' => $notification->type,
                    'severity' => $notification->severity,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'pet_id' => $notification->pet_id,
                    'pet_name' => $notification->pet?->pet_name,
                    'due_date' => $notification->scheduled_for?->toDateString(),
                    'sort_date' => ($notification->scheduled_for ?? $notification->created_at)?->toDateString(),
                ]);
            });

        Appointment::with('pet')
            ->where('client_id', $clientId)
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>=', now())
            ->orderBy('scheduled_at')
            ->limit(20)
            ->get()
            ->each(function (Appointment $appointment) use ($items): void {
                $service = self::APPOINTMENT_LABELS[$appointment->type] ?? ucfirst($appointment->type);
                $scheduledAt = Carbon::parse($appointment->scheduled_at);
                $daysUntil = (int) now()->startOfDay()->diffInDays($scheduledAt->copy()->startOfDay(), false);

                $items->push([
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
                    'due_date' => $scheduledAt->toDateString(),
                    'sort_date' => $scheduledAt->toDateString(),
                ]);
            });

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
                    'severity' => $this->dueSeverity($dueDate),
                    'title' => self::HEALTH_CATEGORY_LABELS[$record->type] ?? 'Health Reminder',
                    'message' => $this->healthDueMessage($record->pet?->pet_name, $record->title, $detail, $dueDate),
                    'pet_id' => $record->pet_id,
                    'pet_name' => $record->pet?->pet_name,
                    'due_date' => $dueDate->toDateString(),
                    'sort_date' => $dueDate->toDateString(),
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
                    'severity' => $this->dueSeverity($dueDate),
                    'title' => self::HEALTH_CATEGORY_LABELS['vaccine'],
                    'message' => $this->healthDueMessage(
                        $vaccination->pet?->pet_name,
                        $vaccination->vaccine_name,
                        $vaccination->dose,
                        $dueDate
                    ),
                    'pet_id' => $vaccination->pet_id,
                    'pet_name' => $vaccination->pet?->pet_name,
                    'due_date' => $dueDate->toDateString(),
                    'sort_date' => $dueDate->toDateString(),
                ]);
            });

        return $this->sortCustomerNotifications($items)->values()->all();
    }

    private function dueSeverity(Carbon $dueDate): string
    {
        if ($dueDate->isPast()) {
            return 'danger';
        }

        if ($dueDate->lte(now()->addDays(7))) {
            return 'warning';
        }

        return 'info';
    }

    private function healthDueMessage(?string $petName, string $title, ?string $detail, Carbon $dueDate): string
    {
        $petLabel = $petName ?? 'Your pet';
        $detailSuffix = $detail ? " ({$detail})" : '';
        $dateLabel = $dueDate->isPast()
            ? 'was due on '.$dueDate->format('M j, Y')
            : 'is due on '.$dueDate->format('M j, Y');

        return "{$petLabel} — {$title}{$detailSuffix} {$dateLabel}.";
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     * @return Collection<int, array<string, mixed>>
     */
    private function sortCustomerNotifications(Collection $items): Collection
    {
        return $items
            ->unique('id')
            ->sortBy([
                fn (array $item) => match ($item['severity']) {
                    'danger' => 0,
                    'warning' => 1,
                    default => 2,
                },
                fn (array $item) => $item['sort_date'] ?? '9999-12-31',
            ]);
    }
}
