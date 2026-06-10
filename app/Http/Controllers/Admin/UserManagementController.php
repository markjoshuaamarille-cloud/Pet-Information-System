<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Clinic;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    public function index(): Response
    {
        $users = User::with(['clinics:id,name'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'created_at', 'client_id']);

        return Inertia::render('Admin/Users', [
            'users'   => $users,
            'roles'   => $this->roles(),
            'clinics' => Clinic::active()->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::in($this->roles())],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $clientId = null;
        if ($validated['role'] === 'customer') {
            $client = Client::firstOrCreate(
                ['email' => $validated['email']],
                [
                    'name' => $validated['name'],
                    'contact' => 'N/A',
                    'address' => null,
                ]
            );
            $clientId = $client->id;
        }

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'client_id' => $clientId,
            'password' => Hash::make($validated['password']),
        ]);

        return redirect()->back()->with('success', 'User created successfully.');
    }

    public function updateRole(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in($this->roles())],
        ]);

        $updates = ['role' => $validated['role']];

        if ($validated['role'] === 'customer' && ! $user->client_id) {
            $client = Client::firstOrCreate(
                ['email' => $user->email],
                [
                    'name' => $user->name,
                    'contact' => 'N/A',
                    'address' => null,
                ]
            );
            $updates['client_id'] = $client->id;
        }

        if ($validated['role'] !== 'customer') {
            $updates['client_id'] = null;
        }

        $user->update($updates);

        return redirect()->back()->with('success', 'User role updated.');
    }

    public function updateClinics(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'clinic_ids'   => ['nullable', 'array'],
            'clinic_ids.*' => ['integer', 'exists:clinics,id'],
            'primary_clinic_id' => ['nullable', 'integer', 'exists:clinics,id'],
        ]);

        $clinicIds = $validated['clinic_ids'] ?? [];
        $primaryId = $validated['primary_clinic_id'] ?? null;

        $syncData = [];
        foreach ($clinicIds as $id) {
            $syncData[(int) $id] = ['is_primary' => (int) $id === (int) $primaryId];
        }

        $user->clinics()->sync($syncData);

        return redirect()->back()->with('success', 'Clinic assignments updated.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()?->id === $user->id) {
            return redirect()->back()->with('success', 'You cannot delete your own admin account.');
        }

        $user->delete();

        return redirect()->back()->with('success', 'User deleted successfully.');
    }

    private function roles(): array
    {
        return ['super_admin', 'veterinarian', 'receptionist', 'groomer', 'customer', 'cashier', 'clinic_owner'];
    }
}
