<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AppointmentRating;
use App\Models\Clinic;
use App\Models\Client;
use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\ServiceCatalog;
use App\Models\User;
use App\Support\AppointmentCancellationNotes;
use App\Support\ActiveClinicGuard;
use App\Support\ClinicContext;
use App\Support\ClinicDateTime;
use App\Support\ClinicPatientScope;
use App\Support\ClinicRatingNotifier;
use App\Support\ClinicServices;
use App\Support\GroomingSlotAvailability;
use App\Support\NoShowAppointmentCancellation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    private const MEDICATION_INVENTORY_CATEGORIES = ['medicine', 'supplement_vitamin'];

    private const VACCINATION_INVENTORY_CATEGORIES = ['vaccine'];

    public function index(Request $request): Response
    {
        $user = $this->currentUser();

        Pet::purgeDeactivatedBeyondOneYear();
        NoShowAppointmentCancellation::cancelDueAppointments();

        $appointmentsQuery = Appointment::with([
            'pet',
            'client',
            'clinic',
            'billings' => fn ($query) => $query
                ->where('status', '!=', 'cancelled')
                ->select('id', 'appointment_id', 'status', 'invoice_number'),
            'healthRecords' => fn ($query) => $query
                ->select([
                    'id', 'appointment_id', 'pet_id', 'type', 'title', 'description',
                    'record_date', 'quantity', 'medication_quantity', 'unit_price', 'line_total',
                    'invoiced_at', 'billing_id', 'medicine_id', 'service_catalog_id',
                ])
                ->orderBy('created_at'),
            'rating:id,appointment_id,rating',
        ])
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

        $clinicId = $request->attributes->get('active_clinic_id');
        $clinic = $clinicId
            ? Clinic::find($clinicId, ['id', 'has_veterinary', 'has_pet_shop', 'has_grooming'])
            : null;
        $catalogCategories = ClinicServices::serviceCatalogCategoriesForClinic($clinic);

        $serviceCatalogs = $clinicId
            ? ServiceCatalog::forClinic($clinicId)
                ->whereIn('category', $catalogCategories)
                ->whereNotIn('category', ['general', 'vaccination', 'medication'])
                ->orderByRaw("FIELD(category,'consultation','grooming','surgery','boarding','emergency_care')")
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'category', 'default_price'])
            : collect();

        $inventoryItems = $clinicId
            ? Medicine::forClinic($clinicId)
                ->sellable()
                ->where(function ($query): void {
                    $query
                        ->where(function ($medicationQuery): void {
                            $medicationQuery
                                ->whereIn('category', self::MEDICATION_INVENTORY_CATEGORIES)
                                ->where('quantity', '>', 0);
                        })
                        ->orWhereIn('category', self::VACCINATION_INVENTORY_CATEGORIES);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'category', 'quantity', 'unit', 'unit_price'])
            : collect();

        return Inertia::render('Appointments/Index', [
            'appointments'      => $appointmentsQuery->get(),
            'pets'              => $petsQuery->get(),
            'clients'           => $clientsQuery->get(['id', 'name']),
            'can_manage_status' => (bool) ($user?->canManageAppointmentStatus()),
            'can_add_services'  => (bool) ($user?->hasAnyRole(['super_admin', 'veterinarian', 'receptionist', 'clinic_owner'])),
            'serviceTypes'      => ClinicServices::appointmentTypeLabelsForClinic($clinic),
            'healthRecordTypes' => ClinicServices::healthRecordTypesForClinic($clinic),
            'serviceCatalogs'   => $serviceCatalogs,
            'inventoryItems'    => $inventoryItems,
            'clientLat'         => $clientLat,
            'clientLng'         => $clientLng,
            'hasLocation'       => $clientLat !== null && $clientLng !== null,
        ]);
    }

    /**
     * Add a priced service item (health record) to an existing appointment.
     */
    public function storeService(Request $request, Appointment $appointment): RedirectResponse
    {
        $this->authorizeServiceManagement($request);

        $clinicId = $this->resolveClinicId($request, $appointment);
        $validated = $this->validateServicePayload($request);
        $attributes = $this->resolveServiceAttributes($validated, $clinicId);

        DB::transaction(function () use ($appointment, $clinicId, $attributes): void {
            if ($attributes['deduct_inventory']) {
                $this->deductMedicationInventory(
                    $attributes['medicine_id'],
                    $attributes['quantity'],
                    $clinicId,
                );
            }

            HealthRecord::create([
                'pet_id'              => $appointment->pet_id,
                'clinic_id'           => $clinicId,
                'appointment_id'      => $appointment->id,
                ...$attributes['record'],
            ]);
        });

        return redirect()->back()->with('success', 'Service added.');
    }

    public function updateService(Request $request, Appointment $appointment, HealthRecord $healthRecord): RedirectResponse
    {
        $this->authorizeServiceManagement($request);
        $this->ensureEditableAppointmentService($appointment, $healthRecord);

        $clinicId = $this->resolveClinicId($request, $appointment);
        $validated = $this->validateServicePayload($request);
        $attributes = $this->resolveServiceAttributes($validated, $clinicId);

        DB::transaction(function () use ($healthRecord, $clinicId, $attributes): void {
            if ($healthRecord->type === 'medication' && $healthRecord->medicine_id) {
                $this->restoreMedicationInventory(
                    (int) $healthRecord->medicine_id,
                    $this->serviceQuantityUsed($healthRecord),
                );
            }

            if ($attributes['deduct_inventory']) {
                $this->deductMedicationInventory(
                    $attributes['medicine_id'],
                    $attributes['quantity'],
                    $clinicId,
                );
            }

            $healthRecord->update($attributes['record']);
        });

        return redirect()->back()->with('success', 'Service updated.');
    }

    public function destroyService(Request $request, Appointment $appointment, HealthRecord $healthRecord): RedirectResponse
    {
        $this->authorizeServiceManagement($request);
        $this->ensureEditableAppointmentService($appointment, $healthRecord);

        DB::transaction(function () use ($healthRecord): void {
            if ($healthRecord->type === 'medication' && $healthRecord->medicine_id) {
                $this->restoreMedicationInventory(
                    (int) $healthRecord->medicine_id,
                    $this->serviceQuantityUsed($healthRecord),
                );
            }

            $healthRecord->delete();
        });

        return redirect()->back()->with('success', 'Service removed.');
    }

    /**
     * @return array{record: array<string, mixed>, medicine_id: ?int, quantity: int, deduct_inventory: bool}
     */
    private function resolveServiceAttributes(array $validated, int $clinicId): array
    {
        $usesInventory = in_array($validated['type'], ['vaccination', 'medication'], true);

        if ($usesInventory && empty($validated['medicine_id'])) {
            throw ValidationException::withMessages([
                'medicine_id' => 'Select an item from inventory.',
            ]);
        }

        if (! $usesInventory && empty($validated['service_catalog_id'])) {
            throw ValidationException::withMessages([
                'service_catalog_id' => 'Select a service from the catalog.',
            ]);
        }

        $quantity = max((int) ($validated['quantity'] ?? 1), 1);
        $unitPrice = (float) ($validated['unit_price'] ?? 0);
        $medicineId = null;
        $medicationQuantity = null;
        $deductInventory = false;

        if ($usesInventory) {
            $allowedCategories = $validated['type'] === 'vaccination'
                ? self::VACCINATION_INVENTORY_CATEGORIES
                : self::MEDICATION_INVENTORY_CATEGORIES;

            $medicine = Medicine::forClinic($clinicId)
                ->sellable()
                ->whereKey($validated['medicine_id'])
                ->whereIn('category', $allowedCategories)
                ->first();

            if (! $medicine) {
                throw ValidationException::withMessages([
                    'medicine_id' => 'Selected inventory item is not available for this service type.',
                ]);
            }

            // Vaccination stock is deducted by the Vaccinations module — billing only links price here.
            if ($validated['type'] === 'medication' && $medicine->quantity < $quantity) {
                throw ValidationException::withMessages([
                    'quantity' => "Insufficient stock. Only {$medicine->quantity} available.",
                ]);
            }

            $medicineId = $medicine->id;
            $medicationQuantity = $quantity;
            $unitPrice = (float) $medicine->unit_price;
            $validated['title'] = $medicine->name;
            $validated['service_catalog_id'] = null;
            $deductInventory = $validated['type'] === 'medication';
        } elseif (! empty($validated['service_catalog_id'])) {
            $catalog = ServiceCatalog::forClinic($clinicId)->find($validated['service_catalog_id']);
            if ($catalog && empty($validated['title'])) {
                $validated['title'] = $catalog->name;
            }
            if ($catalog && $unitPrice <= 0) {
                $unitPrice = (float) $catalog->default_price;
            }
        }

        return [
            'medicine_id' => $medicineId,
            'quantity' => $quantity,
            'deduct_inventory' => $deductInventory,
            'record' => [
                'type'                => $validated['type'],
                'title'               => $validated['title'],
                'description'         => $validated['description'] ?? null,
                'record_date'         => $validated['record_date'],
                'service_catalog_id'  => $validated['service_catalog_id'] ?? null,
                'medicine_id'         => $medicineId,
                'medication_quantity' => $medicationQuantity,
                'unit_price'          => $unitPrice,
                'quantity'            => $quantity,
                'line_total'          => round($unitPrice * $quantity, 2),
            ],
        ];
    }

    private function validateServicePayload(Request $request): array
    {
        $clinicId = ClinicContext::activeClinicId($request);
        $clinic = $clinicId
            ? Clinic::find($clinicId, ['id', 'has_veterinary', 'has_pet_shop', 'has_grooming'])
            : null;

        return $request->validate([
            'type'               => ClinicServices::healthRecordTypeValidationRuleForClinic($clinic),
            'title'              => 'required|string|max:255',
            'description'        => 'nullable|string|max:1000',
            'record_date'        => 'required|date',
            'service_catalog_id' => 'nullable|exists:service_catalogs,id',
            'medicine_id'        => 'nullable|exists:medicines,id',
            'unit_price'         => 'nullable|numeric|min:0',
            'quantity'           => 'nullable|integer|min:1',
        ]);
    }

    private function authorizeServiceManagement(Request $request): void
    {
        $user = $this->currentUser();
        if (! $user?->hasAnyRole(['super_admin', 'veterinarian', 'receptionist', 'clinic_owner'])) {
            abort(403);
        }
    }

    private function resolveClinicId(Request $request, Appointment $appointment): int
    {
        $clinicId = ClinicContext::activeClinicId($request) ?? $appointment->clinic_id;

        if (! $clinicId) {
            throw ValidationException::withMessages([
                'clinic_id' => 'Select your clinic before managing services.',
            ]);
        }

        return (int) $clinicId;
    }

    private function ensureEditableAppointmentService(Appointment $appointment, HealthRecord $healthRecord): void
    {
        if ((int) $healthRecord->appointment_id !== (int) $appointment->id) {
            abort(404);
        }

        if ($healthRecord->invoiced_at !== null) {
            throw ValidationException::withMessages([
                'health_record' => 'This service has already been invoiced and cannot be changed.',
            ]);
        }
    }

    private function serviceQuantityUsed(HealthRecord $healthRecord): int
    {
        return max((int) ($healthRecord->medication_quantity ?? $healthRecord->quantity ?? 1), 1);
    }

    private function restoreMedicationInventory(int $medicineId, int $quantity): void
    {
        if ($quantity <= 0) {
            return;
        }

        Medicine::whereKey($medicineId)->increment('quantity', $quantity);
    }

    private function deductMedicationInventory(int $medicineId, int $quantity, int $clinicId): void
    {
        $medicine = Medicine::forClinic($clinicId)
            ->sellable()
            ->whereKey($medicineId)
            ->whereIn('category', self::MEDICATION_INVENTORY_CATEGORIES)
            ->lockForUpdate()
            ->first();

        if (! $medicine || $medicine->quantity < $quantity) {
            throw ValidationException::withMessages([
                'quantity' => $medicine
                    ? "Insufficient stock. Only {$medicine->quantity} available."
                    : 'Selected medicine is not available.',
            ]);
        }

        $medicine->decrement('quantity', $quantity);
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

        $appointmentClinic = ! empty($validated['clinic_id'])
            ? Clinic::find($validated['clinic_id'], ['id', 'has_veterinary', 'has_pet_shop', 'has_grooming'])
            : ($isCustomer ? null : Clinic::find(ClinicContext::activeClinicId($request), ['id', 'has_veterinary', 'has_pet_shop', 'has_grooming']));

        if ($appointmentClinic) {
            $allowedTypes = ClinicServices::appointmentTypesForClinic($appointmentClinic);
            if ($allowedTypes !== [] && ! in_array($validated['type'], $allowedTypes, true)) {
                return redirect()->back()->withErrors([
                    'type' => 'This service type is not available for the selected clinic.',
                ]);
            }
        }

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

        $slotError = $this->groomingSlotValidationError(
            $validated['type'],
            (int) ($validated['clinic_id'] ?? 0),
            $validated['scheduled_at'],
        );

        if ($slotError) {
            return redirect()->back()->withErrors(['scheduled_at' => $slotError]);
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

            if ($appointment->status !== 'cancelled') {
                $validated['status'] = 'cancelled';
                $validated['notes'] = AppointmentCancellationNotes::appendSelfCancelNote(
                    $validated['notes'] ?? $appointment->notes,
                );
            }
        } elseif (
            ($validated['status'] ?? $appointment->status) === 'cancelled'
            && $appointment->status !== 'cancelled'
        ) {
            $validated['notes'] = AppointmentCancellationNotes::appendStaffCancelNote(
                $validated['notes'] ?? $appointment->notes,
            );
        }

        $pet = Pet::findOrFail($validated['pet_id']);
        if ((int) $pet->client_id !== (int) $validated['client_id']) {
            abort(422, 'Selected pet does not belong to selected client.');
        }

        $validated['scheduled_at'] = ClinicDateTime::parseScheduledAt($validated['scheduled_at']);

        $clinicId = (int) ($validated['clinic_id'] ?? $appointment->clinic_id ?? 0);
        $appointmentType = $validated['type'] ?? $appointment->type;

        if ($validated['status'] !== 'cancelled') {
            $slotError = $this->groomingSlotValidationError(
                $appointmentType,
                $clinicId,
                $validated['scheduled_at'],
                $appointment->id,
            );

            if ($slotError) {
                return redirect()->back()->withErrors(['scheduled_at' => $slotError]);
            }
        }

        $appointment->update($validated);

        return redirect()->back()->with('success', 'Appointment updated successfully.');
    }

    public function destroy(Appointment $appointment): RedirectResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsAppointment($user, $appointment);

        if ($appointment->status === 'cancelled') {
            return redirect()->back()->with('success', 'Appointment already cancelled.');
        }

        $notes = $user?->isCustomer()
            ? AppointmentCancellationNotes::appendSelfCancelNote($appointment->notes)
            : AppointmentCancellationNotes::appendStaffCancelNote($appointment->notes);

        $appointment->update([
            'status' => 'cancelled',
            'notes' => $notes,
        ]);

        return redirect()->back()->with('success', 'Appointment cancelled.');
    }

    public function storeRating(Request $request, Appointment $appointment): RedirectResponse
    {
        $user = $this->currentUser();

        if (! $user?->isCustomer()) {
            abort(403, 'Only customers can rate appointments.');
        }

        $this->ensureCustomerOwnsAppointment($user, $appointment);

        if ($appointment->status !== 'completed') {
            throw ValidationException::withMessages([
                'rating' => 'You can only rate completed appointments.',
            ]);
        }

        if ($appointment->rating) {
            throw ValidationException::withMessages([
                'rating' => 'You have already rated this appointment.',
            ]);
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
        ]);

        AppointmentRating::create([
            'appointment_id' => $appointment->id,
            'user_id' => $user->id,
            'rating' => $validated['rating'],
        ]);

        ClinicRatingNotifier::appointmentRated($appointment, (int) $validated['rating'], $user);

        return redirect()->back()->with('success', 'Thank you for your rating!');
    }

    public function groomingSlotAvailability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'clinic_id' => ['required', 'integer', 'exists:clinics,id'],
            'scheduled_at' => ['required', 'string'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
        ]);

        $scheduledAt = ClinicDateTime::parseScheduledAt($validated['scheduled_at']);

        return response()->json(
            GroomingSlotAvailability::inspect(
                (int) $validated['clinic_id'],
                $scheduledAt,
                isset($validated['appointment_id']) ? (int) $validated['appointment_id'] : null,
            ),
        );
    }

    private function groomingSlotValidationError(
        string $type,
        int $clinicId,
        \Carbon\Carbon $scheduledAt,
        ?int $excludeAppointmentId = null,
    ): ?string {
        if ($type !== 'grooming' || $clinicId <= 0) {
            return null;
        }

        return GroomingSlotAvailability::validationMessage($clinicId, $scheduledAt, $excludeAppointmentId);
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
