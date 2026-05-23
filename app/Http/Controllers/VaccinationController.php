<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\Vaccination;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class VaccinationController extends Controller
{
    private const VACCINE_CATEGORY = 'vaccine';

    public function index(): Response
    {
        return Inertia::render('Vaccinations/Index', [
            'vaccinations' => Vaccination::with(['pet.client', 'appointment', 'medicine:id,name,unit,quantity'])
                ->orderByDesc('administered_on')
                ->get(),
            'vaccines' => Medicine::where('category', self::VACCINE_CATEGORY)
                ->orderBy('name')
                ->get(['id', 'name', 'unit', 'quantity']),
            'pets' => Pet::with('client')->orderBy('pet_name')->get(),
            'vaccinationAppointments' => Appointment::with(['pet', 'client'])
                ->where('type', 'vaccination')
                ->where('status', 'scheduled')
                ->orderByDesc('scheduled_at')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatePayload($request);

        DB::transaction(function () use ($validated): void {
            $vaccine = Medicine::where('category', self::VACCINE_CATEGORY)
                ->whereKey($validated['medicine_id'])
                ->lockForUpdate()
                ->first();

            if (! $vaccine || $vaccine->quantity < $validated['quantity_used']) {
                throw ValidationException::withMessages([
                    'quantity_used' => 'Insufficient vaccine inventory for the quantity used.',
                ]);
            }

            Vaccination::create([
                ...$validated,
                'vaccine_name' => $vaccine->name,
            ]);

            $this->syncAppointmentStatus($validated['appointment_id'] ?? null, $validated['status']);
            $vaccine->decrement('quantity', $validated['quantity_used']);
        });

        return redirect()->back()->with('success', 'Vaccination record saved.');
    }

    public function update(Request $request, Vaccination $vaccination): RedirectResponse
    {
        $validated = $this->validatePayload($request);

        DB::transaction(function () use ($vaccination, $validated): void {
            $vaccination->refresh();
            $previousAppointmentId = $vaccination->appointment_id;

            if ($vaccination->medicine_id && $vaccination->quantity_used > 0) {
                $previousVaccine = Medicine::whereKey($vaccination->medicine_id)->lockForUpdate()->first();
                if ($previousVaccine) {
                    $previousVaccine->increment('quantity', $vaccination->quantity_used);
                }
            }

            $selectedVaccine = Medicine::where('category', self::VACCINE_CATEGORY)
                ->whereKey($validated['medicine_id'])
                ->lockForUpdate()
                ->first();

            if (! $selectedVaccine || $selectedVaccine->quantity < $validated['quantity_used']) {
                throw ValidationException::withMessages([
                    'quantity_used' => 'Insufficient vaccine inventory for the quantity used.',
                ]);
            }

            $vaccination->update([
                ...$validated,
                'vaccine_name' => $selectedVaccine->name,
            ]);

            if ($previousAppointmentId && $previousAppointmentId !== $vaccination->appointment_id) {
                $this->syncAppointmentStatus($previousAppointmentId, 'scheduled');
            }
            $this->syncAppointmentStatus($vaccination->appointment_id, $vaccination->status);
            $selectedVaccine->decrement('quantity', $validated['quantity_used']);
        });

        return redirect()->back()->with('success', 'Vaccination record updated.');
    }

    public function destroy(Vaccination $vaccination): RedirectResponse
    {
        DB::transaction(function () use ($vaccination): void {
            $vaccination->refresh();
            $appointmentId = $vaccination->appointment_id;

            if ($vaccination->medicine_id && $vaccination->quantity_used > 0) {
                $vaccine = Medicine::whereKey($vaccination->medicine_id)->lockForUpdate()->first();
                if ($vaccine) {
                    $vaccine->increment('quantity', $vaccination->quantity_used);
                }
            }

            $vaccination->delete();
            $this->syncAppointmentStatus($appointmentId, 'scheduled');
        });

        return redirect()->back()->with('success', 'Vaccination record deleted.');
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'medicine_id' => [
                'required',
                Rule::exists('medicines', 'id')->where(
                    fn ($query) => $query->where('category', self::VACCINE_CATEGORY)
                ),
            ],
            'dose' => 'nullable|string|max:100',
            'quantity_used' => 'required|integer|min:1',
            'administered_on' => 'required|date',
            'next_due_date' => 'nullable|date|after_or_equal:administered_on',
            'status' => 'required|in:scheduled,completed,missed',
            'notes' => 'nullable|string',
        ]);
    }

    private function syncAppointmentStatus(?int $appointmentId, string $status): void
    {
        if (! $appointmentId) {
            return;
        }

        $mappedStatus = $status === 'missed' ? 'cancelled' : $status;

        Appointment::whereKey($appointmentId)
            ->where('type', 'vaccination')
            ->update(['status' => $mappedStatus]);
    }
}
