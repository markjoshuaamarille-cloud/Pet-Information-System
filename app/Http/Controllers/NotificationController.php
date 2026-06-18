<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\SystemNotification;
use App\Models\User;
use App\Support\PlatformAdminNotifier;
use App\Models\Vaccination;
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

    public function index(\Illuminate\Http\Request $request): Response
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

        $expired     = Medicine::expired()->forClinic($clinicId)->orderBy('expiry_date')->get();
        $critical    = Medicine::criticalStock()->forClinic($clinicId)->whereDate('expiry_date', '>=', now())->orderBy('quantity')->get();
        $expiringSoon = Medicine::expiringSoon()->forClinic($clinicId)->whereDate('expiry_date', '>=', now())->get();

        $notifications = collect();

        foreach ($expired as $medicine) {
            $notifications->push([
                'type' => 'expired',
                'severity' => 'danger',
                'message' => "{$medicine->name} has expired (".Carbon::parse($medicine->expiry_date)->format('M d, Y').").",
                'medicine' => $medicine,
            ]);
        }

        foreach ($critical as $medicine) {
            $notifications->push([
                'type' => 'critical_stock',
                'severity' => 'warning',
                'message' => "{$medicine->name} is at critical stock level ({$medicine->quantity} {$medicine->unit} remaining).",
                'medicine' => $medicine,
            ]);
        }

        foreach ($expiringSoon as $medicine) {
            /** @var Medicine $medicine */
            if (! $medicine->isCriticalStock()) {
                $notifications->push([
                    'type' => 'expiring_soon',
                    'severity' => 'info',
                    'message' => "{$medicine->name} expires on ".Carbon::parse($medicine->expiry_date)->format('M d, Y').".",
                    'medicine' => $medicine,
                ]);
            }
        }

        $systemNotifications = SystemNotification::with(['pet', 'client'])
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (SystemNotification $notification) => [
                'id' => 'system-'.$notification->id,
                'type' => $notification->type,
                'severity' => $notification->severity,
                'message' => $notification->message,
                'title' => $notification->title,
                'created_at' => $notification->created_at?->toIso8601String(),
                'action_href' => $isPlatformAdmin ? match ($notification->type) {
                    'clinic_owner_application' => route('admin.users.index'),
                    'clinic_registration' => route('admin.clinics.index'),
                    default => null,
                } : null,
            ]);

        $allNotifications = $notifications->concat($systemNotifications);

        if ($isPlatformAdmin) {
            $allNotifications = $allNotifications->sortBy(function (array $item) {
                return in_array($item['type'] ?? '', ['clinic_owner_application', 'clinic_registration'], true)
                    ? 0
                    : 1;
            });
        }

        return Inertia::render('Notifications/Index', [
            'notifications' => $allNotifications->values(),
            'isCustomer' => false,
            'platformAdminAlerts' => $isPlatformAdmin ? PlatformAdminNotifier::pendingSummary() : null,
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function customerNotifications(int $clientId, int $daysAhead = 30): array
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
