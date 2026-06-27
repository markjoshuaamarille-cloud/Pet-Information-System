<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\AppointmentResource;
use App\Http\Resources\ClientResource;
use App\Http\Resources\PetResource;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Pet;
use App\Support\ClinicDateTime;
use App\Support\ClinicServices;
use App\Support\NoShowAppointmentCancellation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Appointments
 */
class AppointmentController extends Controller
{
    public function index(): JsonResponse
    {
        $user = $this->currentUser();

        NoShowAppointmentCancellation::cancelDueAppointments();

        $appointmentsQuery = Appointment::with(['pet', 'client'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');
        $petsQuery = Pet::with('client')->orderBy('pet_name');
        $clientsQuery = Client::orderBy('name');

        if ($user?->isCustomer()) {
            $clientId = $this->customerClientId($user);
            $appointmentsQuery->where('client_id', $clientId);
            $petsQuery->where('client_id', $clientId)->active();
            $clientsQuery->whereKey($clientId);
        }

        return $this->success([
            'appointments' => AppointmentResource::collection($appointmentsQuery->get()),
            'pets' => PetResource::collection($petsQuery->get()),
            'clients' => ClientResource::collection($clientsQuery->get(['id', 'name', 'contact', 'email', 'address'])),
            'can_manage_status' => $user && $user->hasAnyRole(['super_admin', 'receptionist', 'veterinarian']),
            'service_types' => ClinicServices::appointmentTypeLabels(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->currentUser();
        $isCustomer = (bool) $user?->isCustomer();

        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'client_id' => $isCustomer ? 'nullable|exists:clients,id' : 'required|exists:clients,id',
            'scheduled_at' => 'required|date',
            'type' => ClinicServices::appointmentTypeValidationRule(),
            'status' => 'required|in:scheduled,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        if ($user?->isCustomer()) {
            $validated['client_id'] = $this->customerClientId($user);
            $validated['status'] = 'scheduled';
        }

        $pet = Pet::findOrFail($validated['pet_id']);
        if ((int) $pet->client_id !== (int) $validated['client_id']) {
            abort(422, 'Selected pet does not belong to selected client.');
        }

        if ($user?->isCustomer() && ! $pet->is_active) {
            abort(422, 'This pet is deactivated. Reactivate it before scheduling an appointment.');
        }

        $validated['scheduled_at'] = ClinicDateTime::parseScheduledAt($validated['scheduled_at']);

        $appointment = Appointment::create($validated);

        return $this->created([
            'appointment' => new AppointmentResource($appointment->load(['pet', 'client'])),
        ], 'Appointment scheduled successfully.');
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsAppointment($user, $appointment);
        $isCustomer = (bool) $user?->isCustomer();

        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'client_id' => $isCustomer ? 'nullable|exists:clients,id' : 'required|exists:clients,id',
            'scheduled_at' => 'required|date',
            'type' => ClinicServices::appointmentTypeValidationRule(),
            'status' => 'required|in:scheduled,completed,cancelled',
            'notes' => 'nullable|string',
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

        return $this->success([
            'appointment' => new AppointmentResource($appointment->fresh()->load(['pet', 'client'])),
        ], 'Appointment updated successfully.');
    }

    public function destroy(Appointment $appointment): JsonResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsAppointment($user, $appointment);

        $appointment->delete();

        return $this->deleted('Appointment cancelled.');
    }
}
