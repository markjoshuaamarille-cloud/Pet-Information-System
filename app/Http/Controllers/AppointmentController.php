<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Client;
use App\Models\Pet;
use App\Models\User;
use App\Support\ActiveClinicGuard;
use App\Support\ClinicContext;
use App\Support\ClinicDateTime;
use App\Support\ClinicPatientScope;
use App\Support\ClinicServices;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $this->currentUser();

        Pet::purgeDeactivatedBeyondOneYear();

        $appointmentsQuery = Appointment::with(['pet', 'client', 'clinic'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');
        $petsQuery = Pet::with('client')->orderBy('pet_name');
        $clientsQuery = Client::orderBy('name');

        if ($user?->isCustomer()) {
            $clientId = $this->customerClientId($user);
            $appointmentsQuery->where('client_id', $clientId);
            $petsQuery->where('client_id', $clientId)->active();
            $clientsQuery->whereKey($clientId);
        } else {
            $clinicId = $request->attributes->get('active_clinic_id');

            if ($clinicId) {
                $appointmentsQuery->where('clinic_id', $clinicId);

                if ($user?->isPlatformAdmin()) {
                    $petsQuery = ClinicPatientScope::petsQuery($clinicId)->with('client')->orderBy('pet_name');
                    $clientsQuery = ClinicPatientScope::clientsQuery($clinicId)->orderBy('name');
                }
            } elseif (! $user?->isPlatformAdmin()) {
                // Non-admin staff without clinic context see nothing clinic-specific
            }
        }

        // Customer home coords for distance suggestions
        $clientLat = null;
        $clientLng = null;
        if ($user?->isCustomer() && $user->client) {
            $clientLat = $user->client->latitude;
            $clientLng = $user->client->longitude;
        }

        return Inertia::render('Appointments/Index', [
            'appointments'      => $appointmentsQuery->get(),
            'pets'              => $petsQuery->get(),
            'clients'           => $clientsQuery->get(['id', 'name']),
            'can_manage_status' => (bool) ($user?->canManageAppointmentStatus()),
            'serviceTypes'      => ClinicServices::appointmentTypeLabels(),
            'clientLat'         => $clientLat,
            'clientLng'         => $clientLng,
            'hasLocation'       => $clientLat !== null && $clientLng !== null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->currentUser();
        $isCustomer = (bool) $user?->isCustomer();

        $validated = $request->validate([
            'clinic_id'    => $isCustomer ? 'required|exists:clinics,id' : 'nullable|exists:clinics,id',
            'pet_id'       => 'required|exists:pets,id',
            'client_id'    => $isCustomer ? 'nullable|exists:clients,id' : 'required|exists:clients,id',
            'scheduled_at' => 'required|date',
            'type'         => ClinicServices::appointmentTypeValidationRule(),
            'status'       => 'required|in:scheduled,completed,cancelled',
            'notes'        => 'nullable|string',
        ]);

        if ($user?->isCustomer()) {
            $validated['client_id'] = $this->customerClientId($user);
            $validated['status'] = 'scheduled';
        }

        // If no clinic passed, use the staff's active clinic context
        if (empty($validated['clinic_id']) && ! $isCustomer) {
            $validated['clinic_id'] = ClinicContext::activeClinicId($request);
        }

        $pet = Pet::findOrFail($validated['pet_id']);
        if ((int) $pet->client_id !== (int) $validated['client_id']) {
            abort(422, 'Selected pet does not belong to selected client.');
        }

        if ($user?->isCustomer() && ! $pet->is_active) {
            return redirect()->back()->withErrors([
                'pet_id' => 'This pet is deactivated. Reactivate it before scheduling an appointment.',
            ]);
        }

        // Validate clinic capabilities when a clinic is specified
        if (! empty($validated['clinic_id'])) {
            if (! ActiveClinicGuard::isOperational((int) $validated['clinic_id'])) {
                return redirect()->back()->withErrors([
                    'clinic_id' => 'This clinic is deactivated and cannot accept new appointments.',
                ]);
            }

            $clinic = Clinic::find($validated['clinic_id']);
            if ($clinic) {
                $needsGrooming = $validated['type'] === 'grooming';
                if ($needsGrooming && (! $clinic->has_grooming || ! $clinic->hasModule('grooming'))) {
                    return redirect()->back()->withErrors(['clinic_id' => 'This clinic does not offer grooming services.']);
                }
                if (! $needsGrooming && ! $clinic->has_veterinary) {
                    return redirect()->back()->withErrors(['clinic_id' => 'This clinic does not offer veterinary services.']);
                }
            }
        } elseif (! $isCustomer) {
            return redirect()->back()->withErrors([
                'clinic_id' => 'Select your clinic before scheduling appointments.',
            ]);
        }

        $validated['scheduled_at'] = ClinicDateTime::parseScheduledAt($validated['scheduled_at']);

        Appointment::create($validated);

        return redirect()->back()->with('success', 'Appointment scheduled successfully.');
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsAppointment($user, $appointment);
        $isCustomer = (bool) $user?->isCustomer();

        $validated = $request->validate([
            'clinic_id'    => 'nullable|exists:clinics,id',
            'pet_id'       => 'required|exists:pets,id',
            'client_id'    => $isCustomer ? 'nullable|exists:clients,id' : 'required|exists:clients,id',
            'scheduled_at' => 'required|date',
            'type'         => ClinicServices::appointmentTypeValidationRule(),
            'status'       => 'required|in:scheduled,completed,cancelled',
            'notes'        => 'nullable|string',
        ]);

        if ($user?->isCustomer()) {
            $validated['client_id'] = $this->customerClientId($user);
            $validated['status'] = 'cancelled';
        }

        $pet = Pet::findOrFail($validated['pet_id']);
        if ((int) $pet->client_id !== (int) $validated['client_id']) {
            abort(422, 'Selected pet does not belong to selected client.');
        }

        $validated['scheduled_at'] = ClinicDateTime::parseScheduledAt($validated['scheduled_at']);

        $appointment->update($validated);

        return redirect()->back()->with('success', 'Appointment updated successfully.');
    }

    public function destroy(Appointment $appointment): RedirectResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsAppointment($user, $appointment);

        $appointment->delete();

        return redirect()->back()->with('success', 'Appointment cancelled.');
    }

    private function ensureCustomerOwnsAppointment(?User $user, Appointment $appointment): void
    {
        if (! $user?->isCustomer()) {
            return;
        }

        if ((int) $appointment->client_id !== $this->customerClientId($user)) {
            abort(403, 'You do not have permission to access this appointment.');
        }
    }

    private function customerClientId(User $user): int
    {
        if (! $user->client_id) {
            abort(403, 'Your customer account is not linked to a client record.');
        }

        return (int) $user->client_id;
    }

    private function currentUser(): ?User
    {
        $user = auth()->user();

        return $user instanceof User ? $user : null;
    }
}
