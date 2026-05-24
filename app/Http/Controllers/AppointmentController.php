<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function index(): Response
    {
        $user = $this->currentUser();

        $appointmentsQuery = Appointment::with(['pet', 'client'])->orderBy('scheduled_at');
        $petsQuery = Pet::with('client')->orderBy('pet_name');
        $clientsQuery = Client::orderBy('name');

        if ($user?->isCustomer()) {
            $clientId = $this->customerClientId($user);
            $appointmentsQuery->where('client_id', $clientId);
            $petsQuery->where('client_id', $clientId);
            $clientsQuery->whereKey($clientId);
        }

        return Inertia::render('Appointments/Index', [
            'appointments' => $appointmentsQuery->get(),
            'pets' => $petsQuery->get(),
            'clients' => $clientsQuery->get(['id', 'name']),
            'can_manage_status' => $user && $user->hasAnyRole(['super_admin', 'receptionist', 'veterinarian']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->currentUser();
        $isCustomer = (bool) $user?->isCustomer();

        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'client_id' => $isCustomer ? 'nullable|exists:clients,id' : 'required|exists:clients,id',
            'scheduled_at' => 'required|date',
            'type' => 'required|in:checkup,vaccination,grooming,consultation,other',
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

        Appointment::create($validated);

        return redirect()->back()->with('success', 'Appointment scheduled successfully.');
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsAppointment($user, $appointment);
        $isCustomer = (bool) $user?->isCustomer();

        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'client_id' => $isCustomer ? 'nullable|exists:clients,id' : 'required|exists:clients,id',
            'scheduled_at' => 'required|date',
            'type' => 'required|in:checkup,vaccination,grooming,consultation,other',
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
