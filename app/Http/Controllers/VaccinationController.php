<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\User;
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
        $user = auth()->user();

        return Inertia::render('Vaccinations/Index', [
            'vaccinations' => Vaccination::with(['pet.client', 'appointment', 'medicine:id,name,unit,quantity', 'administeredBy:id,name'])
                ->orderByDesc('administered_on')
                ->get(),
            'vaccines' => Medicine::where('category', self::VACCINE_CATEGORY)
                ->orderBy('name')
                ->get(['id', 'name', 'unit', 'quantity']),
            'pets' => Pet::with('client')->orderBy('pet_name')->get(),
            'veterinarians' => User::query()
                ->where('role', 'veterinarian')
                ->orderBy('name')
                ->get(['id', 'name']),
            'vaccinationAppointments' => Appointment::with(['pet', 'client'])
                ->where('type', 'vaccination')
                ->where('status', 'scheduled')
                ->whereDoesntHave('vaccinations')
                ->orderByDesc('scheduled_at')
                ->get(),
            'can_manage_records' => $user instanceof User
                && $user->hasAnyRole(['super_admin', 'veterinarian', 'receptionist']),
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

            $this->syncAppointmentStatus($validated['appointment_id'], $validated['status']);
            $vaccine->decrement('quantity', $validated['quantity_used']);
        });

        return redirect()->back()->with('success', 'Vaccination record saved.');
    }

    public function update(Request $request, Vaccination $vaccination): RedirectResponse
    {
        $validated = $this->validatePayload($request, $vaccination);

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

            $vaccination->delete();
            $this->syncAppointmentStatus($appointmentId, 'scheduled');
        });

        return redirect()->back()->with('success', 'Vaccination record deleted.');
    }

    private function validatePayload(Request $request, ?Vaccination $vaccination = null): array
    {
        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'appointment_id' => [
                'required',
                Rule::exists('appointments', 'id')->where(
                    fn ($query) => $query->where('type', 'vaccination')
                ),
            ],
            'medicine_id' => [
                'required',
                Rule::exists('medicines', 'id')->where(
                    fn ($query) => $query->where('category', self::VACCINE_CATEGORY)
                ),
            ],
            'administered_by_user_id' => [
                'required',
                Rule::exists('users', 'id')->where(
                    fn ($query) => $query->where('role', 'veterinarian')
                ),
            ],
            'dose' => 'nullable|string|max:100',
            'quantity_used' => 'required|integer|min:1',
            'administered_on' => 'required|date',
            'next_due_date' => 'nullable|date|after_or_equal:administered_on',
            'status' => 'required|in:scheduled,completed,missed',
            'notes' => 'nullable|string',
        ]);

        $appointment = Appointment::query()
            ->whereKey($validated['appointment_id'])
            ->where('type', 'vaccination')
            ->first();

        if (! $appointment) {
            throw ValidationException::withMessages([
                'appointment_id' => 'Select a valid vaccination appointment.',
            ]);
        }

        if ((int) $appointment->pet_id !== (int) $validated['pet_id']) {
            throw ValidationException::withMessages([
                'pet_id' => 'The selected pet must match the vaccination appointment.',
            ]);
        }

        $alreadyLinked = Vaccination::query()
            ->where('appointment_id', $validated['appointment_id'])
            ->when($vaccination, fn ($query) => $query->whereKeyNot($vaccination->id))
            ->exists();

        if ($alreadyLinked) {
            throw ValidationException::withMessages([
                'appointment_id' => 'This appointment is already linked to another vaccination record.',
            ]);
        }

        if ($vaccination === null && $appointment->status !== 'scheduled') {
            throw ValidationException::withMessages([
                'appointment_id' => 'Only scheduled vaccination appointments can be used for new records.',
            ]);
        }

        return $validated;
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
