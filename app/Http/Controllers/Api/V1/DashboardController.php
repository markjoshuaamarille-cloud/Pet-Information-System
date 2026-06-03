<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\User;
use App\Models\Vaccination;
use Illuminate\Http\JsonResponse;

/**
 * @group Dashboard
 */
class DashboardController extends Controller
{
    private const HEALTH_CATEGORY_LABELS = [
        'vaccine' => 'Vaccine',
        'vaccination' => 'Vaccination',
        'medication' => 'Medication',
        'consultation' => 'Consultation',
        'grooming' => 'Grooming',
        'surgery' => 'Surgery',
        'boarding' => 'Boarding / Hotel',
        'emergency_care' => 'Emergency Care',
    ];

    private const RECENT_APPOINTMENT_DAYS = 7;

    public function __invoke(): JsonResponse
    {
        $user = $this->currentUser();
        $isVeterinarian = (bool) ($user?->hasRole('veterinarian'));
        $canManageAppointmentStatus = (bool) ($user && $user->hasAnyRole(['super_admin', 'veterinarian', 'receptionist']));

        if ($user?->isCustomer()) {
            $clientId = $user->client_id;

            return $this->success([
                'stats' => [
                    'pets' => Pet::where('client_id', $clientId)->count(),
                    'clients' => $clientId ? 1 : 0,
                    'appointments_today' => Appointment::where('client_id', $clientId)
                        ->where('status', '!=', 'cancelled')
                        ->where(fn ($query) => $this->applyTodayAndRecentAppointmentsScope($query))
                        ->count(),
                    'medicines' => 0,
                ],
                'expired_medicines' => [],
                'critical_medicines' => [],
                'expiring_soon' => [],
                'upcoming_appointments' => Appointment::with(['pet', 'client'])
                    ->where('client_id', $clientId)
                    ->where('status', 'scheduled')
                    ->whereDate('scheduled_at', '>=', today())
                    ->orderByDesc('scheduled_at')
                    ->limit(5)
                    ->get(),
                'due_health_records' => $this->upcomingHealthEvents(clientId: $clientId),
                'appointments_section_title' => 'Upcoming Appointments',
                'can_manage_appointment_status' => false,
            ]);
        }

        $expiredMedicines = Medicine::expired()->orderBy('expiry_date')->get();
        $criticalMedicines = Medicine::criticalStock()->whereDate('expiry_date', '>=', now())->orderBy('quantity')->get();
        $expiringSoon = Medicine::expiringSoon()->whereDate('expiry_date', '>=', now())->get();

        $upcomingAppointmentsQuery = Appointment::with(['pet', 'client'])
            ->where('status', '!=', 'cancelled')
            ->where(fn ($query) => $this->applyTodayRecentAndUpcomingAppointmentsScope($query))
            ->orderByDesc('scheduled_at');

        if (! $isVeterinarian) {
            $upcomingAppointmentsQuery->limit(8);
        }

        return $this->success([
            'stats' => [
                'pets' => Pet::count(),
                'clients' => Client::count(),
                'appointments_today' => Appointment::query()
                    ->where('status', '!=', 'cancelled')
                    ->where(fn ($query) => $this->applyTodayAndRecentAppointmentsScope($query))
                    ->count(),
                'medicines' => Medicine::count(),
            ],
            'expired_medicines' => $expiredMedicines,
            'critical_medicines' => $criticalMedicines,
            'expiring_soon' => $expiringSoon,
            'upcoming_appointments' => $upcomingAppointmentsQuery->get(),
            'due_health_records' => $this->upcomingHealthEvents(),
            'can_manage_appointment_status' => $canManageAppointmentStatus,
        ]);
    }

    private function applyTodayAndRecentAppointmentsScope($query): void
    {
        $query->where(function ($scope): void {
            $scope->whereDate('scheduled_at', today())
                ->orWhere(function ($recent): void {
                    $recent->whereDate('scheduled_at', '>=', today()->subDays(self::RECENT_APPOINTMENT_DAYS))
                        ->whereDate('scheduled_at', '<', today())
                        ->where('status', 'scheduled');
                });
        });
    }

    private function applyTodayRecentAndUpcomingAppointmentsScope($query): void
    {
        $query->where(function ($scope): void {
            $scope->whereDate('scheduled_at', today())
                ->orWhere(function ($recent): void {
                    $recent->whereDate('scheduled_at', '>=', today()->subDays(self::RECENT_APPOINTMENT_DAYS))
                        ->whereDate('scheduled_at', '<', today())
                        ->where('status', 'scheduled');
                })
                ->orWhere(function ($upcoming): void {
                    $upcoming->whereDate('scheduled_at', '>', today())
                        ->where('status', 'scheduled');
                });
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function upcomingHealthEvents(?int $clientId = null, int $daysAhead = 30): array
    {
        $healthRecordsQuery = HealthRecord::with(['pet', 'medicine'])
            ->whereNotNull('next_due_date')
            ->whereDate('next_due_date', '<=', now()->addDays($daysAhead));

        $vaccinationsQuery = Vaccination::with('pet')
            ->whereNotNull('next_due_date')
            ->whereDate('next_due_date', '<=', now()->addDays($daysAhead));

        if ($clientId) {
            $healthRecordsQuery->whereHas('pet', fn ($query) => $query->where('client_id', $clientId));
            $vaccinationsQuery->whereHas('pet', fn ($query) => $query->where('client_id', $clientId));
        }

        $events = collect();

        foreach ($healthRecordsQuery->get() as $record) {
            $events->push([
                'id' => 'health-'.$record->id,
                'source' => 'health_record',
                'record_id' => $record->id,
                'category' => $record->type,
                'category_label' => self::HEALTH_CATEGORY_LABELS[$record->type] ?? ucfirst($record->type),
                'pet_id' => $record->pet_id,
                'pet_name' => $record->pet?->pet_name,
                'title' => $record->title,
                'due_date' => $record->next_due_date?->toDateString(),
                'is_overdue' => $record->next_due_date?->isPast() ?? false,
            ]);
        }

        foreach ($vaccinationsQuery->get() as $vaccination) {
            $events->push([
                'id' => 'vaccination-'.$vaccination->id,
                'source' => 'vaccination',
                'record_id' => $vaccination->id,
                'category' => 'vaccine',
                'category_label' => self::HEALTH_CATEGORY_LABELS['vaccine'],
                'pet_id' => $vaccination->pet_id,
                'pet_name' => $vaccination->pet?->pet_name,
                'title' => $vaccination->vaccine_name,
                'due_date' => $vaccination->next_due_date?->toDateString(),
                'is_overdue' => $vaccination->next_due_date?->isPast() ?? false,
            ]);
        }

        return $events->sortByDesc('due_date')->values()->all();
    }
}
