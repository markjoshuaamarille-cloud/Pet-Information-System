<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Clinic;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\User;
use App\Support\ClinicPatientScope;
use App\Support\ClinicScope;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const RECENT_APPOINTMENT_DAYS = 7;

    public function __invoke(Request $request): Response
    {
        $user = auth()->user();
        $user = $user instanceof User ? $user : null;
        $clinicId = $request->attributes->get('active_clinic_id');

        if ($user?->isCustomer()) {
            $clientId = $user->client_id;

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
                'appointmentHistory' => $appointmentHistory,
                'appointmentsStatLabel' => 'Upcoming Appointments',
                'clinicDirectory' => $this->clinicDirectoryOverview(),
            ]);
        }

        $expiredMedicines = ClinicScope::forClinicQuery(Medicine::expired(), $clinicId, $user)->orderBy('expiry_date')->get();
        $criticalMedicines = ClinicScope::forClinicQuery(Medicine::criticalStock(), $clinicId, $user)->whereDate('expiry_date', '>=', now())->orderBy('quantity')->get();
        $expiringSoon = ClinicScope::forClinicQuery(Medicine::expiringSoon(), $clinicId, $user)->whereDate('expiry_date', '>=', now())->get();

        $petsQuery = $clinicId !== null || ! ClinicScope::restrictsUnscopedData($user)
            ? ClinicPatientScope::petsQuery($clinicId)
            : Pet::query()->whereRaw('0 = 1');
        $clientsQuery = $clinicId !== null || ! ClinicScope::restrictsUnscopedData($user)
            ? ClinicPatientScope::clientsQuery($clinicId)
            : Client::query()->whereRaw('0 = 1');

        $statAppointmentsQuery = ClinicScope::forClinicQuery(
            Appointment::with(['pet', 'client', 'clinic']),
            $clinicId,
            $user,
        )
            ->where('status', '!=', 'cancelled')
            ->where(function ($query): void {
                $this->applyTodayAndRecentAppointmentsScope($query);
            });

        return Inertia::render('Dashboard', [
            'stats' => [
                'pets' => (clone $petsQuery)->count(),
                'clients' => (clone $clientsQuery)->count(),
                'appointments_today' => (clone $statAppointmentsQuery)->count(),
                'medicines' => ClinicScope::forClinicQuery(Medicine::query(), $clinicId, $user)->count(),
            ],
            'statPets' => (clone $petsQuery)->with('client')->orderBy('pet_name')->limit(50)->get(),
            'statClients' => (clone $clientsQuery)->orderBy('name')->limit(50)->get(),
            'statAppointments' => $statAppointmentsQuery
                ->orderByDesc('scheduled_at')
                ->limit(50)
                ->get(),
            'statMedicines' => ClinicScope::forClinicQuery(Medicine::query(), $clinicId, $user)->orderBy('name')->limit(50)->get(),
            'expiredMedicines' => $expiredMedicines,
            'criticalMedicines' => $criticalMedicines,
            'expiringSoon' => $expiringSoon,
            'appointmentHistory' => collect(),
            'appointmentsStatLabel' => 'Upcoming Appointments',
            'clinicDirectory' => $this->clinicDirectoryOverview(),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function clinicDirectoryOverview(): array
    {
        return Clinic::query()
            ->active()
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'address_formatted',
                'city',
                'province',
                'contact',
                'has_veterinary',
                'has_pet_shop',
                'has_grooming',
            ])
            ->map(function (Clinic $clinic): array {
                $services = [];

                if ($clinic->has_veterinary) {
                    $services[] = ['key' => 'veterinary', 'label' => 'Veterinary Care'];
                    $services[] = ['key' => 'vaccination', 'label' => 'Vaccination'];
                    $services[] = ['key' => 'consultation', 'label' => 'Consultation'];
                    $services[] = ['key' => 'surgery', 'label' => 'Surgery'];
                }

                if ($clinic->has_grooming) {
                    $services[] = ['key' => 'grooming', 'label' => 'Grooming & Spa'];
                }

                if ($clinic->has_pet_shop) {
                    $services[] = ['key' => 'pet_shop', 'label' => 'Pet Shop'];
                }

                return [
                    'id' => $clinic->id,
                    'name' => $clinic->name,
                    'address' => $clinic->address_formatted
                        ?: trim(collect([$clinic->city, $clinic->province])->filter()->join(', '))
                        ?: null,
                    'contact' => $clinic->contact,
                    'has_veterinary' => $clinic->has_veterinary,
                    'has_pet_shop' => $clinic->has_pet_shop,
                    'has_grooming' => $clinic->has_grooming,
                    'services' => $services,
                ];
            })
            ->values()
            ->all();
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
}
