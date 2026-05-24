<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\GroomingRecord;
use App\Models\Pet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GroomingRecordController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Grooming/Index', [
            'records' => GroomingRecord::with(['pet.client', 'appointment'])->orderByDesc('service_date')->get(),
            'pets' => Pet::with('client')->orderBy('pet_name')->get(),
            'groomingAppointments' => Appointment::with(['pet', 'client'])
                ->where('type', 'grooming')
                ->where('status', 'scheduled')
                ->orderByDesc('scheduled_at')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatePayload($request);

        $record = GroomingRecord::create($validated);
        $this->syncAppointmentStatus($record->appointment_id, $record->status);

        return redirect()->back()->with('success', 'Grooming record saved.');
    }

    public function update(Request $request, GroomingRecord $grooming): RedirectResponse
    {
        $previousAppointmentId = $grooming->appointment_id;
        $validated = $this->validatePayload($request);

        $grooming->update($validated);
        if ($previousAppointmentId && $previousAppointmentId !== $grooming->appointment_id) {
            $this->syncAppointmentStatus($previousAppointmentId, 'scheduled');
        }
        $this->syncAppointmentStatus($grooming->appointment_id, $grooming->status);

        return redirect()->back()->with('success', 'Grooming record updated.');
    }

    public function destroy(GroomingRecord $grooming): RedirectResponse
    {
        $appointmentId = $grooming->appointment_id;
        $grooming->delete();
        $this->syncAppointmentStatus($appointmentId, 'scheduled');

        return redirect()->back()->with('success', 'Grooming record deleted.');
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'appointment_id' => [
                'required',
                Rule::exists('appointments', 'id')->where(
                    fn ($query) => $query->where('type', 'grooming')
                ),
            ],
            'service_type' => 'required|string|max:255',
            'service_date' => 'required|date',
            'status' => 'required|in:scheduled,completed,cancelled',
            'notes' => 'nullable|string',
        ]);
    }

    private function syncAppointmentStatus(?int $appointmentId, string $status): void
    {
        if (! $appointmentId) {
            return;
        }

        Appointment::whereKey($appointmentId)
            ->where('type', 'grooming')
            ->update(['status' => $status]);
    }
}
