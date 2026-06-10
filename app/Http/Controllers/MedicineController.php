<?php

namespace App\Http\Controllers;

use App\Models\Medicine;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MedicineController extends Controller
{
    private const CATEGORIES = [
        'medicine',
        'vaccine',
        'supplement_vitamin',
        'consumable_supply',
        'parasite_control',
        'grooming_hygiene',
        'pet_food',
    ];

    public function index(Request $request): Response
    {
        $user = $this->currentUser();
        $clinicId = $request->attributes->get('active_clinic_id');

        return Inertia::render('Medicines/Index', [
            'medicines' => Medicine::forClinic($clinicId)->orderBy('name')->get()->map(fn (Medicine $m) => [
                ...$m->toArray(),
                'stock_status' => $m->stockStatus(),
                'is_active' => $m->is_active !== false,
            ]),
            'can_manage_activation' => (bool) $user?->hasAnyRole(['super_admin', 'clinic_owner']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'description' => 'nullable|string',
            'quantity' => 'required|integer|min:0',
            'unit' => 'required|string|max:50',
            'unit_price' => 'required|numeric|min:0',
            'expiry_date' => 'required|date',
            'reorder_level' => 'required|integer|min:0',
        ]);

        $validated['clinic_id'] = $request->attributes->get('active_clinic_id');
        $validated['is_active'] = true;

        Medicine::create($validated);

        return redirect()->back()->with('success', 'Medicine added to inventory.');
    }

    public function update(Request $request, Medicine $medicine): RedirectResponse
    {
        $this->ensureMedicineAccessible($request, $medicine);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'description' => 'nullable|string',
            'quantity' => 'required|integer|min:0',
            'unit' => 'required|string|max:50',
            'unit_price' => 'required|numeric|min:0',
            'expiry_date' => 'required|date',
            'reorder_level' => 'required|integer|min:0',
        ]);

        $medicine->update($validated);

        return redirect()->back()->with('success', 'Medicine inventory updated.');
    }

    public function destroy(Request $request, Medicine $medicine): RedirectResponse
    {
        $this->ensureMedicineAccessible($request, $medicine);

        $medicine->delete();

        return redirect()->back()->with('success', 'Medicine removed from inventory.');
    }

    public function toggleActive(Request $request, Medicine $medicine): RedirectResponse
    {
        $user = $this->currentUser();
        $this->ensureCanManageActivation($user);
        $this->ensureMedicineAccessible($request, $medicine);

        $activating = ! $medicine->is_active;
        $medicine->update(['is_active' => $activating]);

        return redirect()->back()->with(
            'success',
            $activating
                ? '"'.$medicine->name.'" reactivated. It is available in the pet shop again.'
                : '"'.$medicine->name.'" deactivated. It will no longer appear in the pet shop or accept new orders.',
        );
    }

    private function ensureCanManageActivation(?User $user): void
    {
        if (! $user?->hasAnyRole(['super_admin', 'clinic_owner'])) {
            abort(403, 'You do not have permission to change product availability.');
        }
    }

    private function ensureMedicineAccessible(Request $request, Medicine $medicine): void
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        if ($clinicId !== null && (int) $medicine->clinic_id !== (int) $clinicId) {
            abort(403, 'This product does not belong to the active clinic.');
        }
    }

    private function currentUser(): ?User
    {
        $user = auth()->user();

        return $user instanceof User ? $user : null;
    }
}
