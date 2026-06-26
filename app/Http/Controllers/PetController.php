<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Clinic;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\User;
use App\Support\ClinicPatientScope;
use App\Support\ClinicServices;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PetController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $this->currentUser();
        $clinicId = $request->attributes->get('active_clinic_id');

        Pet::purgeDeactivatedBeyondOneYear();

        $petsQuery = Pet::with('client')->latest();
        $clientsQuery = Client::query()->orderBy('name');

        if ($user?->isCustomer()) {
            $clientId = $this->customerClientId($user);
            $petsQuery->where('client_id', $clientId);
            $clientsQuery->whereKey($clientId);
        } elseif ($user?->isPlatformAdmin() && $clinicId) {
            $petsQuery = ClinicPatientScope::petsQuery($clinicId)->with('client')->latest();
            $clientsQuery = ClinicPatientScope::clientsQuery($clinicId)->orderBy('name');
        }

        return Inertia::render('Pets/Index', [
            'pets' => $petsQuery->get(),
            'clients' => $clientsQuery->get(['id', 'name']),
            'can_manage_records' => (bool) ($user?->canManagePetRecords()),
            'can_register_pet' => (bool) ($user?->canRegisterPet()),
            'can_toggle_pet_status' => (bool) $user?->isCustomer(),
        ]);
    }

    public function toggleActivation(Pet $pet): RedirectResponse
    {
        $user = $this->currentUser();

        if (! $user?->isCustomer()) {
            abort(403, 'Only customers can activate or deactivate their pets.');
        }

        $this->ensureCustomerOwnsPet($user, $pet);

        if ($pet->is_active) {
            $pet->update([
                'is_active' => false,
                'deactivated_at' => now(),
            ]);

            return redirect()->back()->with(
                'success',
                'Pet deactivated. Appointments cannot be scheduled until the pet is reactivated.'
            );
        }

        $pet->update([
            'is_active' => true,
            'deactivated_at' => null,
        ]);

        return redirect()->back()->with('success', 'Pet reactivated successfully.');
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->currentUser();

        if (! $user?->canRegisterPet()) {
            abort(403, 'Only customers and platform administrators can register pets.');
        }

        $isCustomer = (bool) $user->isCustomer();
        $request->merge([
            'microchip_no' => $this->normalizeMicrochipNo($request->input('microchip_no')),
        ]);

        $validated = $request->validate([
            'client_id' => $isCustomer ? 'nullable|exists:clients,id' : 'required|exists:clients,id',
            'pet_name' => 'required|string|max:255',
            'species' => 'required|string|max:255',
            'breed' => 'nullable|string|max:255',
            'age' => 'nullable|string|max:50',
            'gender' => 'nullable|string|max:50',
            'birth_date' => 'nullable|date|before_or_equal:today',
            'weight' => 'nullable|numeric|min:0|max:9999.99',
            'color' => 'nullable|string|max:100',
            'microchip_no' => 'nullable|string|max:100|unique:pets,microchip_no',
            'vaccination_status' => ['nullable', Rule::in(['up_to_date', 'partial', 'not_vaccinated', 'unknown'])],
            'medical_history' => 'nullable|string',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($user?->isCustomer()) {
            $validated['client_id'] = $this->customerClientId($user);
        }

        if ($request->hasFile('photo')) {
            $validated['photo_path'] = $request->file('photo')->store('pets', 's3');
        }

        unset($validated['photo']);

        Pet::create($validated);

        return redirect()->back()->with('success', 'Pet record created successfully.');
    }

    public function show(Request $request, Pet $pet): Response
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsPet($user, $pet);

        $clinicId = $request->attributes->get('active_clinic_id');
        $clinic = $clinicId
            ? Clinic::find($clinicId, ['id', 'has_veterinary', 'has_pet_shop', 'has_grooming'])
            : null;

        // Load clinical records with clinic label (hybrid: global pet, all-clinic records)
        $pet->load([
            'client',
            'healthRecords.medicine',
            'healthRecords.clinic',
            'healthRecords.billing:id,status,invoice_number',
            'appointments' => fn ($query) => $query
                ->where('pet_id', $pet->id)
                ->when($clinicId, fn ($q) => $q->where('clinic_id', $clinicId))
                ->whereIn('status', ['scheduled', 'completed'])
                ->orderByDesc('scheduled_at'),
            'appointments.pet:id,pet_name,client_id',
            'appointments.client:id,name',
            'appointments.clinic',
            'vaccinations.clinic',
            'groomingRecords.clinic',
        ]);

        return Inertia::render('Pets/Show', [
            'pet' => $pet,
            'medicines' => Medicine::whereIn('category', ['medicine', 'supplement_vitamin'])
                ->forClinic($clinicId)
                ->where('quantity', '>', 0)
                ->orderBy('name')
                ->get(['id', 'name', 'category', 'quantity', 'unit_price']),
            'servicePrices' => \App\Models\ServiceCatalog::forClinic($clinicId)
                ->pluck('default_price', 'code'),
            'veterinarians' => $this->staffForClinic($clinicId, 'veterinarian'),
            'groomers' => $this->staffForClinic($clinicId, 'groomer'),
            'can_manage_health_records' => (bool) ($user?->canManageHealthRecords()),
            'healthRecordTypes' => ClinicServices::healthRecordTypesForClinic($clinic),
        ]);
    }

    public function update(Request $request, Pet $pet): RedirectResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsPet($user, $pet);
        $isCustomer = (bool) $user?->isCustomer();
        $request->merge([
            'microchip_no' => $this->normalizeMicrochipNo($request->input('microchip_no')),
        ]);

        $validated = $request->validate([
            'client_id' => $isCustomer ? 'nullable|exists:clients,id' : 'required|exists:clients,id',
            'pet_name' => 'required|string|max:255',
            'species' => 'required|string|max:255',
            'breed' => 'nullable|string|max:255',
            'age' => 'nullable|string|max:50',
            'gender' => 'nullable|string|max:50',
            'birth_date' => 'nullable|date|before_or_equal:today',
            'weight' => 'nullable|numeric|min:0|max:9999.99',
            'color' => 'nullable|string|max:100',
            'microchip_no' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('pets', 'microchip_no')->ignore($pet->id),
            ],
            'vaccination_status' => ['nullable', Rule::in(['up_to_date', 'partial', 'not_vaccinated', 'unknown'])],
            'medical_history' => 'nullable|string',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($user?->isCustomer()) {
            $validated['client_id'] = $this->customerClientId($user);
        }

        if ($request->hasFile('photo')) {
            if ($pet->photo_path) {
                Storage::disk('s3')->delete($pet->photo_path);
            }
            $validated['photo_path'] = $request->file('photo')->store('pets', 's3');
        }

        unset($validated['photo']);

        $pet->update($validated);

        return redirect()->back()->with('success', 'Pet record updated successfully.');
    }

    public function destroy(Pet $pet): RedirectResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsPet($user, $pet);

        if ($pet->photo_path) {
            Storage::disk('s3')->delete($pet->photo_path);
        }

        $pet->delete();

        return redirect()->route('pets.index')->with('success', 'Pet record deleted successfully.');
    }

    public function clientRecord(Pet $pet): Response
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsPet($user, $pet);

        $pet->load(['client', 'healthRecords.medicine']);

        return Inertia::render('Pets/ClientRecord', [
            'pet' => $pet,
        ]);
    }

    private function ensureCustomerOwnsPet(?User $user, Pet $pet): void
    {
        if (! $user?->isCustomer()) {
            return;
        }

        if ((int) $pet->client_id !== $this->customerClientId($user)) {
            abort(403, 'You do not have permission to access this pet.');
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

    private function staffForClinic(?int $clinicId, string $role): \Illuminate\Support\Collection
    {
        return User::query()
            ->where('role', $role)
            ->assignedToClinic($clinicId)
            ->orderBy('name')
            ->get(['id', 'name', 'role']);
    }

    private function normalizeMicrochipNo(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = trim($value);
        if ($normalized === '') {
            return null;
        }

        $placeholderValues = ['n/a', 'na', 'none', 'unknown', '-'];
        if (in_array(strtolower($normalized), $placeholderValues, true)) {
            return null;
        }

        return $normalized;
    }
}
