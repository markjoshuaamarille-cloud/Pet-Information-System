<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\GroomingRecord;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GroomingRecordController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $clinicId = $request->attributes->get('active_clinic_id');

        return Inertia::render('Grooming/Index', [
            'records' => GroomingRecord::with(['pet.client', 'appointment', 'groomer:id,name'])
                ->forClinic($clinicId)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->get(),
            'pets' => Pet::with('client')->orderBy('pet_name')->get(),
            'groomingAppointments' => Appointment::with(['pet', 'client'])
                ->forClinic($clinicId)
                ->where('type', 'grooming')
                ->where('status', 'scheduled')
                ->orderByDesc('scheduled_at')
                ->get(),
            'groomers' => $this->clinicGroomers($clinicId),
            'can_manage_records' => $user instanceof User
                && $user->canManageGroomingRecords(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $validated = $this->validatePayload($request);
        $validated['clinic_id'] = $request->attributes->get('active_clinic_id');
        $validated['groomer_id'] = $this->resolveGroomerId($request, $user instanceof User ? $user : null);

        $record = GroomingRecord::create($validated);
        $this->syncAppointmentStatus($record->appointment_id, $record->status);

        return redirect()->back()->with('success', 'Grooming record saved.');
    }

    public function update(Request $request, GroomingRecord $grooming): RedirectResponse
    {
        $user = auth()->user();
        $previousAppointmentId = $grooming->appointment_id;
        $validated = $this->validatePayload($request);
        $validated['groomer_id'] = $this->resolveGroomerId(
            $request,
            $user instanceof User ? $user : null,
            $grooming->groomer_id,
        );

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
        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'appointment_id' => [
                'required',
                Rule::exists('appointments', 'id')->where(
                    fn ($query) => $query->where('type', 'grooming')
                ),
            ],
            'service_type' => [
                Rule::requiredIf(fn () => $request->input('status') !== 'cancelled'),
                'nullable',
                'string',
                'max:255',
            ],
            'service_date' => 'required|date',
            'status' => 'required|in:completed,cancelled',
            'groomer_id' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        if ($validated['status'] === 'cancelled' && empty($validated['service_type'])) {
            $validated['service_type'] = 'Cancelled appointment';
        }

        return $validated;
    }

    private function syncAppointmentStatus(?int $appointmentId, string $status): void
    {
        if (! $appointmentId || ! in_array($status, ['completed', 'cancelled'], true)) {
            return;
        }

        Appointment::whereKey($appointmentId)
            ->where('type', 'grooming')
            ->whereIn('status', ['scheduled', 'completed', 'cancelled'])
            ->update(['status' => $status]);
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function clinicGroomers(?int $clinicId): array
    {
        if (! $clinicId) {
            return [];
        }

        return User::query()
            ->where('role', 'groomer')
            ->where('is_active', true)
            ->whereHas('clinics', fn ($query) => $query
                ->where('clinics.id', $clinicId)
                ->where('clinics.status', 'active'))
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $groomer) => [
                'id' => $groomer->id,
                'name' => $groomer->name,
            ])
            ->all();
    }

    private function resolveGroomerId(Request $request, ?User $user, ?int $existingGroomerId = null): ?int
    {
        if ($request->filled('groomer_id')) {
            return (int) $request->input('groomer_id');
        }

        if ($user?->hasRole('groomer')) {
            return $user->id;
        }

        return $existingGroomerId;
    }
}
