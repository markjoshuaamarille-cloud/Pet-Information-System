<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\User;
use App\Models\Vaccination;
use App\Support\ClinicPatientScope;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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

    public function __invoke(Request $request): Response
    {
        $user = auth()->user();
        $user = $user instanceof User ? $user : null;
        $clinicId = $request->attributes->get('active_clinic_id');
        $isVeterinarian = (bool) ($user?->hasRole('veterinarian'));
        $canManageAppointmentStatus = (bool) ($user?->canManageAppointmentStatus());

        if ($user?->isCustomer()) {
            $clientId = $user->client_id;

            $upcomingAppointments = Appointment::with(['pet', 'client'])
                ->where('client_id', $clientId)
                ->where('status', 'scheduled')
                ->whereDate('scheduled_at', '>=', today())
                ->orderByDesc('scheduled_at')
                ->limit(5)
                ->get();

            $appointmentHistoryQuery = Appointment::with(['pet', 'client'])
                ->where('client_id', $clientId)
                ->where(function ($query): void {
                    $query->whereIn('status', ['completed', 'cancelled'])
                        ->orWhere(function ($past): void {
                            $past->whereDate('scheduled_at', '<', today())
                                ->where('status', 'scheduled');
                        });
                });

            $appointmentHistory = (clone $appointmentHistoryQuery)
                ->orderByDesc('scheduled_at')
                ->limit(20)
                ->get();

            $dueHealthRecords = $this->upcomingHealthEvents(clientId: $clientId);

            $statAppointmentsQuery = Appointment::with(['pet', 'client'])
                ->where('client_id', $clientId)
                ->where('status', '!=', 'cancelled')
                ->where(function ($query): void {
                    $this->applyTodayAndRecentAppointmentsScope($query);
                });

            return Inertia::render('Dashboard', [
                'stats' => [
                    'pets' => Pet::where('client_id', $clientId)->count(),
                    'clients' => $clientId ? 1 : 0,
                    'appointments_today' => (clone $statAppointmentsQuery)->count(),
                    'appointments_history' => $appointmentHistoryQuery->count(),
                    'medicines' => 0,
                ],
                'statPets' => Pet::with('client')
                    ->where('client_id', $clientId)
                    ->orderBy('pet_name')
                    ->limit(50)
                    ->get(),
                'statClients' => collect(),
                'statAppointments' => $statAppointmentsQuery
                    ->orderByDesc('scheduled_at')
                    ->limit(50)
                    ->get(),
                'statMedicines' => collect(),
                'expiredMedicines' => collect(),
                'criticalMedicines' => collect(),
                'expiringSoon' => collect(),
                'upcomingAppointments' => $upcomingAppointments,
                'appointmentHistory' => $appointmentHistory,
                'dueHealthRecords' => $dueHealthRecords,
                'appointmentsSectionTitle' => 'Upcoming Appointments',
                'appointmentsStatLabel' => 'Upcoming Appointments',
                'canManageAppointmentStatus' => false,
                'canDeleteOverdueHealthRecords' => false,
            ]);
        }

        $expiredMedicines = Medicine::expired()->forClinic($clinicId)->orderBy('expiry_date')->get();
        $criticalMedicines = Medicine::criticalStock()->forClinic($clinicId)->whereDate('expiry_date', '>=', now())->orderBy('quantity')->get();
        $expiringSoon = Medicine::expiringSoon()->forClinic($clinicId)->whereDate('expiry_date', '>=', now())->get();

        $upcomingAppointmentsQuery = Appointment::with(['pet', 'client', 'clinic'])
            ->forClinic($clinicId)
            ->where('status', '!=', 'cancelled')
            ->where(function ($query): void {
                $this->applyTodayRecentAndUpcomingAppointmentsScope($query);
            });

        $upcomingAppointmentsQuery->orderByDesc('scheduled_at');

        if (! $isVeterinarian) {
            $upcomingAppointmentsQuery->limit(8);
        }

        $upcomingAppointments = $upcomingAppointmentsQuery->get();

        $dueHealthRecords = $this->upcomingHealthEvents(clinicId: $clinicId);

        $petsQuery = ClinicPatientScope::petsQuery($clinicId);
        $clientsQuery = ClinicPatientScope::clientsQuery($clinicId);

        $statAppointmentsQuery = Appointment::with(['pet', 'client', 'clinic'])
            ->forClinic($clinicId)
            ->where('status', '!=', 'cancelled')
            ->where(function ($query): void {
                $this->applyTodayAndRecentAppointmentsScope($query);
            });

        return Inertia::render('Dashboard', [
            'stats' => [
                'pets' => (clone $petsQuery)->count(),
                'clients' => (clone $clientsQuery)->count(),
                'appointments_today' => (clone $statAppointmentsQuery)->count(),
                'medicines' => Medicine::forClinic($clinicId)->count(),
            ],
            'statPets' => (clone $petsQuery)->with('client')->orderBy('pet_name')->limit(50)->get(),
            'statClients' => (clone $clientsQuery)->orderBy('name')->limit(50)->get(),
            'statAppointments' => $statAppointmentsQuery
                ->orderByDesc('scheduled_at')
                ->limit(50)
                ->get(),
            'statMedicines' => Medicine::forClinic($clinicId)->orderBy('name')->limit(50)->get(),
            'expiredMedicines' => $expiredMedicines,
            'criticalMedicines' => $criticalMedicines,
            'expiringSoon' => $expiringSoon,
            'upcomingAppointments' => $upcomingAppointments,
            'appointmentHistory' => collect(),
            'dueHealthRecords' => $dueHealthRecords,
            'appointmentsSectionTitle' => $isVeterinarian ? "Today's & Pending Recent Appointments" : 'Today, Recent & Upcoming Appointments',
            'appointmentsStatLabel' => 'Upcoming Appointments',
            'canManageAppointmentStatus' => $canManageAppointmentStatus,
            'canDeleteOverdueHealthRecords' => (bool) ($user?->canManageHealthRecords()),
        ]);
    }

    /**
     * Today plus still-pending appointments from the last few days.
     */
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

    /**
     * Today, recent pending catch-up, and future scheduled appointments.
     */
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
    private function upcomingHealthEvents(?int $clientId = null, ?int $clinicId = null, int $daysAhead = 30): array
    {
        $healthRecordsQuery = HealthRecord::with(['pet', 'medicine'])
            ->when($clinicId, fn ($query) => $query->forClinic($clinicId))
            ->whereNotNull('next_due_date')
            ->whereDate('next_due_date', '<=', now()->addDays($daysAhead));

        $vaccinationsQuery = Vaccination::with('pet')
            ->when($clinicId, fn ($query) => $query->forClinic($clinicId))
            ->whereNotNull('next_due_date')
            ->whereDate('next_due_date', '<=', now()->addDays($daysAhead));

        if ($clientId) {
            $healthRecordsQuery->whereHas('pet', fn ($query) => $query->where('client_id', $clientId));
            $vaccinationsQuery->whereHas('pet', fn ($query) => $query->where('client_id', $clientId));
        }

        $events = collect();

        foreach ($healthRecordsQuery->get() as $record) {
            $detail = $record->type === 'medication' && $record->medicine
                ? $record->medicine->name
                : null;

            $events->push([
                'id' => 'health-'.$record->id,
                'source' => 'health_record',
                'record_id' => $record->id,
                'category' => $record->type,
                'category_label' => self::HEALTH_CATEGORY_LABELS[$record->type] ?? ucfirst($record->type),
                'pet_id' => $record->pet_id,
                'pet_name' => $record->pet?->pet_name,
                'title' => $record->title,
                'detail' => $detail,
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
                'detail' => $vaccination->dose,
                'due_date' => $vaccination->next_due_date?->toDateString(),
                'is_overdue' => $vaccination->next_due_date?->isPast() ?? false,
            ]);
        }

        return $events
            ->sortByDesc('due_date')
            ->values()
            ->all();
    }
}
