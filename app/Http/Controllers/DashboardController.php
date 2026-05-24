<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $user = auth()->user();
        $user = $user instanceof User ? $user : null;
        $isVeterinarian = (bool) ($user?->hasRole('veterinarian'));
        $canManageAppointmentStatus = (bool) ($user && $user->hasAnyRole(['super_admin', 'veterinarian', 'receptionist']));

        if ($user?->isCustomer()) {
            $clientId = $user->client_id;

            $upcomingAppointments = Appointment::with(['pet', 'client'])
                ->where('client_id', $clientId)
                ->where('status', 'scheduled')
                ->where('scheduled_at', '>=', now())
                ->orderBy('scheduled_at')
                ->limit(5)
                ->get();

            $dueHealthRecords = HealthRecord::with('pet')
                ->whereHas('pet', fn ($query) => $query->where('client_id', $clientId))
                ->whereNotNull('next_due_date')
                ->whereDate('next_due_date', '<=', now()->addDays(14))
                ->orderBy('next_due_date')
                ->limit(5)
                ->get();

            return Inertia::render('Dashboard', [
                'stats' => [
                    'pets' => Pet::where('client_id', $clientId)->count(),
                    'clients' => $clientId ? 1 : 0,
                    'appointments_today' => Appointment::where('client_id', $clientId)
                        ->whereDate('scheduled_at', today())
                        ->where('status', 'scheduled')
                        ->count(),
                    'medicines' => 0,
                ],
                'expiredMedicines' => collect(),
                'criticalMedicines' => collect(),
                'expiringSoon' => collect(),
                'upcomingAppointments' => $upcomingAppointments,
                'dueHealthRecords' => $dueHealthRecords,
                'appointmentsSectionTitle' => 'Upcoming Appointments',
                'canManageAppointmentStatus' => false,
            ]);
        }

        $expiredMedicines = Medicine::expired()->orderBy('expiry_date')->get();
        $criticalMedicines = Medicine::criticalStock()->whereDate('expiry_date', '>=', now())->orderBy('quantity')->get();
        $expiringSoon = Medicine::expiringSoon()->whereDate('expiry_date', '>=', now())->get();

        $upcomingAppointmentsQuery = Appointment::with(['pet', 'client']);
        if ($isVeterinarian) {
            $upcomingAppointmentsQuery
                ->where(function ($query): void {
                    $query->whereDate('scheduled_at', today())
                        ->orWhere(function ($nested): void {
                            $nested
                                ->whereDate('scheduled_at', '>=', today()->subDays(7))
                                ->whereDate('scheduled_at', '<', today())
                                ->where('status', '!=', 'completed');
                        });
                })
                ->orderByDesc('scheduled_at');
        } else {
            $upcomingAppointmentsQuery
                ->where('status', 'scheduled')
                ->where('scheduled_at', '>=', now())
                ->orderBy('scheduled_at')
                ->limit(5);
        }
        $upcomingAppointments = $upcomingAppointmentsQuery->get();

        $dueHealthRecords = HealthRecord::with('pet')
            ->whereNotNull('next_due_date')
            ->whereDate('next_due_date', '<=', now()->addDays(14))
            ->orderBy('next_due_date')
            ->limit(5)
            ->get();

        return Inertia::render('Dashboard', [
            'stats' => [
                'pets' => Pet::count(),
                'clients' => Client::count(),
                'appointments_today' => Appointment::whereDate('scheduled_at', today())->where('status', 'scheduled')->count(),
                'medicines' => Medicine::count(),
            ],
            'expiredMedicines' => $expiredMedicines,
            'criticalMedicines' => $criticalMedicines,
            'expiringSoon' => $expiringSoon,
            'upcomingAppointments' => $upcomingAppointments,
            'dueHealthRecords' => $dueHealthRecords,
            'appointmentsSectionTitle' => $isVeterinarian ? "Today's & Pending Recent Appointments" : 'Upcoming Appointments',
            'canManageAppointmentStatus' => $canManageAppointmentStatus,
        ]);
    }
}
