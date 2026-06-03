<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\AppointmentResource;
use App\Http\Resources\PetResource;
use App\Models\Appointment;
use App\Models\GroomingRecord;
use App\Models\Pet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @group Grooming
 */
class GroomingRecordController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->success([
            'records' => GroomingRecord::with(['pet.client', 'appointment'])->orderByDesc('service_date')->get(),
            'pets' => PetResource::collection(Pet::with('client')->orderBy('pet_name')->get()),
            'grooming_appointments' => AppointmentResource::collection(
                Appointment::with(['pet', 'client'])
                    ->where('type', 'grooming')
                    ->where('status', 'scheduled')
                    ->orderByDesc('scheduled_at')
                    ->get()
            ),
            'can_manage_records' => $this->currentUser()?->hasAnyRole(['super_admin', 'groomer', 'receptionist']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);
        $record = GroomingRecord::create($validated);
        $this->syncAppointmentStatus($record->appointment_id, $record->status);

        return $this->created(['record' => $record->load(['pet.client', 'appointment'])]);
    }

    public function update(Request $request, GroomingRecord $grooming): JsonResponse
    {
        $previousAppointmentId = $grooming->appointment_id;
        $validated = $this->validatePayload($request);
        $grooming->update($validated);

        if ($previousAppointmentId && $previousAppointmentId !== $grooming->appointment_id) {
            $this->syncAppointmentStatus($previousAppointmentId, 'scheduled');
        }
        $this->syncAppointmentStatus($grooming->appointment_id, $grooming->status);

        return $this->success(['record' => $grooming->fresh()->load(['pet.client', 'appointment'])]);
    }

    public function destroy(GroomingRecord $grooming): JsonResponse
    {
        $appointmentId = $grooming->appointment_id;
        $grooming->delete();
        $this->syncAppointmentStatus($appointmentId, 'scheduled');

        return $this->deleted('Grooming record deleted.');
    }

    /**
     * @return array<string, mixed>
     */
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
            'status' => 'required|in:completed,cancelled',
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
