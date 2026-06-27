<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Models\User;
use App\Support\GeoapifyAddress;
use App\Support\ClinicRegistrationDocuments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClinicController extends Controller
{
    public function index(): Response
    {
        $clinics = Clinic::with(['submittedBy:id,name,email', 'approvedBy:id,name'])
            ->withCount('users')
            ->orderByRaw("FIELD(status,'pending','active','inactive','rejected')")
            ->orderBy('name')
            ->get();

        return Inertia::render('Clinics/Index', [
            'clinics'    => $clinics,
            'allModules' => Clinic::ALL_MODULES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateClinic($request);
        $validated['status'] = 'active';
        $validated['approved_by_user_id'] = $request->user()->id;
        $validated['approved_at'] = now();
        $validated['enabled_modules'] = $this->resolveModules($validated, $request->input('enabled_modules', []));
        $validated['other_requirements'] = [];

        $validated = ClinicRegistrationDocuments::mergeUploadedDocuments(
            $request,
            $validated,
            requireMandatory: false,
        );

        Clinic::create($validated);

        return redirect()->route('admin.clinics.index')->with('success', 'Clinic created and activated.');
    }

    public function update(Request $request, Clinic $clinic): RedirectResponse
    {
        $validated = $this->validateClinic($request, $clinic->id);
        $validated['enabled_modules'] = $this->resolveModules($validated, $request->input('enabled_modules', []));

        $validated = ClinicRegistrationDocuments::mergeUploadedDocumentsForUpdate(
            $request,
            $validated,
            $clinic,
        );

        $clinic->update($validated);

        return redirect()->route('admin.clinics.index')->with('success', 'Clinic updated.');
    }

    public function destroy(Request $request, Clinic $clinic): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
        ], [
            'password.required' => 'Your password is required to delete a clinic.',
        ]);

        if (! Hash::check($request->input('password'), $request->user()->password)) {
            throw ValidationException::withMessages([
                'password' => 'The password you entered is incorrect.',
            ]);
        }

        $clinic->delete();

        return redirect()->route('admin.clinics.index')->with('success', 'Clinic deleted.');
    }

    public function approve(Request $request, Clinic $clinic): RedirectResponse
    {
        $clinic->update([
            'status'              => 'active',
            'approved_by_user_id' => $request->user()->id,
            'approved_at'         => now(),
        ]);

        return redirect()->route('admin.clinics.index')->with('success', 'Clinic approved and activated.');
    }

    public function reject(Request $request, Clinic $clinic): RedirectResponse
    {
        $clinic->update(['status' => 'rejected']);

        return redirect()->route('admin.clinics.index')->with('success', 'Clinic registration rejected.');
    }

    public function deactivate(Clinic $clinic): RedirectResponse
    {
        if ($clinic->status !== 'active') {
            return redirect()->route('admin.clinics.index')->with('error', 'Only active clinics can be deactivated.');
        }

        $clinic->update(['status' => 'inactive']);

        return redirect()->route('admin.clinics.index')->with('success', '"'.$clinic->name.'" has been deactivated. It can no longer accept appointments or transactions.');
    }

    public function activate(Request $request, Clinic $clinic): RedirectResponse
    {
        if ($clinic->status !== 'inactive') {
            return redirect()->route('admin.clinics.index')->with('error', 'Only inactive clinics can be reactivated.');
        }

        $clinic->update([
            'status'              => 'active',
            'approved_by_user_id' => $request->user()->id,
            'approved_at'         => now(),
        ]);

        return redirect()->route('admin.clinics.index')->with('success', '"'.$clinic->name.'" has been reactivated.');
    }

    /**
     * Pull clinic details from Geoapify places API and return as JSON
     * so the frontend can pre-fill the registration form.
     */
    public function importFromGeoapify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'place' => ['required', 'string', 'min:2', 'max:255'],
        ]);

        $apiKey = config('services.geoapify.key');

        if (! $apiKey) {
            return response()->json(['message' => 'Geoapify not configured.'], 503);
        }

        $response = Http::timeout(15)->get('https://api.geoapify.com/v1/geocode/search', [
            'text'   => $validated['place'],
            'limit'  => 1,
            'apiKey' => $apiKey,
            'lang'   => 'en',
        ]);

        if (! $response->successful()) {
            Log::warning('Geoapify clinic import failed', ['status' => $response->status()]);

            return response()->json(['message' => 'Unable to find that place.'], 502);
        }

        $feature = $response->json('features.0');

        if (! $feature) {
            return response()->json(['message' => 'No location found for that place name.'], 404);
        }

        $properties  = $feature['properties'] ?? [];
        $coordinates = $feature['geometry']['coordinates'] ?? [null, null];
        $parsed = GeoapifyAddress::fromGeocodeProperties($properties);
        $normalized = GeoapifyAddress::normalizeFields([
            ...$parsed,
            'latitude' => $coordinates[1],
            'longitude' => $coordinates[0],
        ]);

        // Detect service categories from Geoapify
        $categories = $properties['categories'] ?? [];
        $hasVet      = in_array('pet.veterinary', $categories, true);
        $hasPetShop  = in_array('pet.shop', $categories, true);
        $hasGrooming = in_array('pet.service', $categories, true);

        return response()->json([
            'name'              => $properties['name'] ?? '',
            ...$normalized,
            'has_veterinary'    => $hasVet,
            'has_pet_shop'      => $hasPetShop,
            'has_grooming'      => $hasGrooming,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function validateClinic(Request $request, ?int $excludeId = null): array
    {
        $validated = $request->validate([
            'name'              => ['required', 'string', 'max:255'],
            'slug'              => ['nullable', 'string', 'max:255', Rule::unique('clinics', 'slug')->ignore($excludeId)],
            'contact'           => ['nullable', 'string', 'max:100'],
            'email'             => ['nullable', 'email', 'max:255'],
            'website'           => ['nullable', 'url', 'max:255'],
            ...GeoapifyAddress::validationRules(requireCoordinates: true),
            'has_veterinary'    => ['boolean'],
            'has_pet_shop'      => ['boolean'],
            'has_grooming'      => ['boolean'],
            ...ClinicRegistrationDocuments::validationRules(requireMandatory: false),
        ]);

        return [
            ...collect($validated)->only([
                'name', 'slug', 'contact', 'email', 'website',
                'has_veterinary', 'has_pet_shop', 'has_grooming',
            ])->all(),
            ...GeoapifyAddress::normalizeFields($validated),
        ];
    }

    private function resolveModules(array $validated, array $requestedModules): array
    {
        if (! empty($requestedModules)) {
            return array_values(array_intersect($requestedModules, Clinic::ALL_MODULES));
        }

        return Clinic::defaultModulesForFlags(
            $validated['has_veterinary'] ?? false,
            $validated['has_pet_shop'] ?? false,
            $validated['has_grooming'] ?? false,
        );
    }
}
