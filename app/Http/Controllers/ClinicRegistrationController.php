<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Support\GeoapifyAddress;
use App\Support\PlatformAdminNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClinicRegistrationController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Clinics/Register', [
            'allModules' => Clinic::ALL_MODULES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'              => ['required', 'string', 'max:255'],
            'contact'           => ['nullable', 'string', 'max:100'],
            'email'             => ['nullable', 'email', 'max:255'],
            'website'           => ['nullable', 'url', 'max:255'],
            ...GeoapifyAddress::validationRules(requireCoordinates: true),
            'has_veterinary'    => ['boolean'],
            'has_pet_shop'      => ['boolean'],
            'has_grooming'      => ['boolean'],
        ]);

        $payload = [
            ...GeoapifyAddress::normalizeFields($validated),
            'name'                  => $validated['name'],
            'contact'               => $validated['contact'] ?? null,
            'email'                 => $validated['email'] ?? null,
            'website'               => $validated['website'] ?? null,
            'has_veterinary'        => $request->boolean('has_veterinary'),
            'has_pet_shop'          => $request->boolean('has_pet_shop'),
            'has_grooming'          => $request->boolean('has_grooming'),
            'status'                => 'pending',
            'submitted_by_user_id'  => $request->user()->id,
            'enabled_modules'       => Clinic::defaultModulesForFlags(
                $request->boolean('has_veterinary'),
                $request->boolean('has_pet_shop'),
                $request->boolean('has_grooming'),
            ),
        ];

        $clinic = Clinic::create($payload);

        PlatformAdminNotifier::clinicRegistrationSubmitted(
            $clinic,
            $request->user(),
        );

        return redirect()->route('clinic-registration.create')
            ->with('success', 'Your clinic registration has been submitted. The platform administrator has been notified and will review it for approval.');
    }
}
