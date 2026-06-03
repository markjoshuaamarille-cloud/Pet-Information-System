<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\AppointmentResource;
use App\Http\Resources\MedicineResource;
use App\Http\Resources\PetResource;
use App\Http\Resources\UserResource;
use App\Models\Appointment;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\User;
use App\Models\Vaccination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * @group Vaccinations
 */
class VaccinationController extends Controller
{
    private const VACCINE_CATEGORY = 'vaccine';

    public function index(): JsonResponse
    {
        return $this->success([
            'vaccinations' => Vaccination::with(['pet.client', 'appointment', 'medicine:id,name,unit,quantity', 'administeredBy:id,name'])
                ->orderByDesc('administered_on')
                ->get(),
            'vaccines' => MedicineResource::collection(
                Medicine::where('category', self::VACCINE_CATEGORY)->orderBy('name')->get(['id', 'name', 'unit', 'quantity'])
            ),
            'pets' => PetResource::collection(Pet::with('client')->orderBy('pet_name')->get()),
            'veterinarians' => UserResource::collection(
                User::query()->where('role', 'veterinarian')->orderBy('name')->get(['id', 'name'])
            ),
            'vaccination_appointments' => AppointmentResource::collection(
                Appointment::with(['pet', 'client'])
                    ->where('type', 'vaccination')
                    ->where('status', 'scheduled')
                    ->whereDoesntHave('vaccinations')
                    ->orderByDesc('scheduled_at')
                    ->get()
            ),
            'can_manage_records' => $this->currentUser()?->hasAnyRole(['super_admin', 'veterinarian', 'receptionist']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $vaccination = DB::transaction(function () use ($validated) {
            $vaccine = Medicine::where('category', self::VACCINE_CATEGORY)
                ->whereKey($validated['medicine_id'])
                ->lockForUpdate()
                ->first();

            if (! $vaccine || $vaccine->quantity < $validated['quantity_used']) {
                throw ValidationException::withMessages([
                    'quantity_used' => 'Insufficient vaccine inventory for the quantity used.',
                ]);
            }

            $record = Vaccination::create([
                ...$validated,
                'vaccine_name' => $vaccine->name,
            ]);

            $this->syncAppointmentStatus($validated['appointment_id'], $validated['status']);
            $vaccine->decrement('quantity', $validated['quantity_used']);

            return $record;
        });

        return $this->created(['vaccination' => $vaccination->load(['pet', 'appointment', 'medicine', 'administeredBy'])]);
    }

    public function update(Request $request, Vaccination $vaccination): JsonResponse
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

        return $this->success(['vaccination' => $vaccination->fresh()->load(['pet', 'appointment', 'medicine', 'administeredBy'])]);
    }

    public function destroy(Vaccination $vaccination): JsonResponse
    {
        DB::transaction(function () use ($vaccination): void {
            $vaccination->refresh();
            $appointmentId = $vaccination->appointment_id;
            $vaccination->delete();
            $this->syncAppointmentStatus($appointmentId, 'scheduled');
        });

        return $this->deleted('Vaccination record deleted.');
    }

    /**
     * @return array<string, mixed>
     */
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
            throw ValidationException::withMessages(['appointment_id' => 'Select a valid vaccination appointment.']);
        }

        if ((int) $appointment->pet_id !== (int) $validated['pet_id']) {
            throw ValidationException::withMessages(['pet_id' => 'The selected pet must match the vaccination appointment.']);
        }

        $alreadyLinked = Vaccination::query()
            ->where('appointment_id', $validated['appointment_id'])
            ->when($vaccination, fn ($query) => $query->whereKeyNot($vaccination->id))
            ->exists();

        if ($alreadyLinked) {
            throw ValidationException::withMessages(['appointment_id' => 'This appointment is already linked to another vaccination record.']);
        }

        if ($vaccination === null && $appointment->status !== 'scheduled') {
            throw ValidationException::withMessages(['appointment_id' => 'Only scheduled vaccination appointments can be used for new records.']);
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
