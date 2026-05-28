<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PetController extends Controller
{
    public function index(): Response
    {
        $user = $this->currentUser();

        $petsQuery = Pet::with('client')->latest();
        $clientsQuery = Client::query()->orderBy('name');

        if ($user?->isCustomer()) {
            $clientId = $this->customerClientId($user);
            $petsQuery->where('client_id', $clientId);
            $clientsQuery->whereKey($clientId);
        }

        return Inertia::render('Pets/Index', [
            'pets' => $petsQuery->get(),
            'clients' => $clientsQuery->get(['id', 'name']),
            'can_manage_records' => $user && ! $user->hasRole('cashier') && (
                $user->hasAnyRole(['super_admin', 'veterinarian', 'receptionist']) || $user->isCustomer()
            ),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $this->currentUser();
        $isCustomer = (bool) $user?->isCustomer();
        $request->merge([
            'microchip_no' => $this->normalizeMicrochipNo($request->input('microchip_no')),
        ]);

        $validated = $request->validate([
            'client_id' => $isCustomer ? 'nullable|exists:clients,id' : 'required|exists:clients,id',
            'pet_name' => 'required|string|max:255',
            'species' => 'required|string|max:255',
            'breed' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:0|max:150',
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

    public function show(Pet $pet): Response
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsPet($user, $pet);

        $pet->load(['client', 'healthRecords.medicine', 'appointments']);

        return Inertia::render('Pets/Show', [
            'pet' => $pet,
            'medicines' => Medicine::whereIn('category', ['medicine', 'supplement_vitamin'])
                ->where('quantity', '>', 0)
                ->orderBy('name')
                ->get(['id', 'name', 'category', 'quantity']),
            'veterinarians' => User::query()
                ->where('role', 'veterinarian')
                ->orderBy('name')
                ->get(['id', 'name', 'role']),
            'groomers' => User::query()
                ->where('role', 'groomer')
                ->orderBy('name')
                ->get(['id', 'name', 'role']),
            'can_manage_health_records' => $user && $user->hasAnyRole(['super_admin', 'veterinarian', 'receptionist']),
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
            'age' => 'nullable|integer|min:0|max:150',
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
