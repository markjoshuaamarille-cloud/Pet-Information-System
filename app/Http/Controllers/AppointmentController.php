<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Pet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Appointments/Index', [
            'appointments' => Appointment::with(['pet', 'client'])->orderBy('scheduled_at')->get(),
            'pets' => Pet::with('client')->orderBy('pet_name')->get(),
            'clients' => Client::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'client_id' => 'required|exists:clients,id',
            'scheduled_at' => 'required|date',
            'type' => 'required|in:checkup,vaccination,grooming,consultation,other',
            'status' => 'required|in:scheduled,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        Appointment::create($validated);

        return redirect()->back()->with('success', 'Appointment scheduled successfully.');
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'client_id' => 'required|exists:clients,id',
            'scheduled_at' => 'required|date',
            'type' => 'required|in:checkup,vaccination,grooming,consultation,other',
            'status' => 'required|in:scheduled,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        $appointment->update($validated);

        return redirect()->back()->with('success', 'Appointment updated successfully.');
    }

    public function destroy(Appointment $appointment): RedirectResponse
    {
        $appointment->delete();

        return redirect()->back()->with('success', 'Appointment cancelled.');
    }
}
