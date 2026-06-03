<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ClientResource;
use App\Http\Resources\MedicineResource;
use App\Http\Resources\PetResource;
use App\Http\Resources\UserResource;
use App\Models\Client;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\ServiceCatalog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * @group Pets
 */
class PetController extends Controller
{
    public function index(): JsonResponse
    {
        $user = $this->currentUser();

        $petsQuery = Pet::with('client')->latest();
        $clientsQuery = Client::query()->orderBy('name');

        if ($user?->isCustomer()) {
            $clientId = $this->customerClientId($user);
            $petsQuery->where('client_id', $clientId);
            $clientsQuery->whereKey($clientId);
        }

        return $this->success([
            'pets' => PetResource::collection($petsQuery->get()),
            'clients' => ClientResource::collection($clientsQuery->get(['id', 'name', 'contact', 'email', 'address'])),
            'can_manage_records' => $user && ! $user->hasRole('cashier') && (
                $user->hasAnyRole(['super_admin', 'veterinarian', 'receptionist']) || $user->isCustomer()
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
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

        $pet = Pet::create($validated);

        return $this->created(['pet' => new PetResource($pet->load('client'))]);
    }

    public function show(Pet $pet): JsonResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsPet($user, $pet);

        $pet->load(['client', 'healthRecords.medicine', 'appointments']);

        return $this->success([
            'pet' => new PetResource($pet),
            'medicines' => MedicineResource::collection(
                Medicine::whereIn('category', ['medicine', 'supplement_vitamin'])
                    ->where('quantity', '>', 0)
                    ->orderBy('name')
                    ->get(['id', 'name', 'category', 'quantity', 'unit_price'])
            ),
            'service_prices' => ServiceCatalog::query()->pluck('default_price', 'code'),
            'veterinarians' => UserResource::collection(
                User::query()->where('role', 'veterinarian')->orderBy('name')->get(['id', 'name', 'role'])
            ),
            'groomers' => UserResource::collection(
                User::query()->where('role', 'groomer')->orderBy('name')->get(['id', 'name', 'role'])
            ),
            'can_manage_health_records' => $user && $user->hasAnyRole(['super_admin', 'veterinarian', 'receptionist']),
        ]);
    }

    public function update(Request $request, Pet $pet): JsonResponse
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

        return $this->success(['pet' => new PetResource($pet->fresh()->load('client'))], 'Pet record updated successfully.');
    }

    public function destroy(Pet $pet): JsonResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsPet($user, $pet);

        if ($pet->photo_path) {
            Storage::disk('s3')->delete($pet->photo_path);
        }

        $pet->delete();

        return $this->deleted('Pet record deleted successfully.');
    }

    public function clientRecord(Pet $pet): JsonResponse
    {
        $user = $this->currentUser();
        $this->ensureCustomerOwnsPet($user, $pet);

        $pet->load(['client', 'healthRecords.medicine']);

        return $this->success(['pet' => new PetResource($pet)]);
    }
}
