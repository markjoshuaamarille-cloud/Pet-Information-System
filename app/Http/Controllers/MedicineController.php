<?php

namespace App\Http\Controllers;

use App\Models\Medicine;
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
        $clinicId = $request->attributes->get('active_clinic_id');

        return Inertia::render('Medicines/Index', [
            'medicines' => Medicine::forClinic($clinicId)->orderBy('name')->get()->map(fn (Medicine $m) => [
                ...$m->toArray(),
                'stock_status' => $m->stockStatus(),
            ]),
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

        Medicine::create($validated);

        return redirect()->back()->with('success', 'Medicine added to inventory.');
    }

    public function update(Request $request, Medicine $medicine): RedirectResponse
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

        $medicine->update($validated);

        return redirect()->back()->with('success', 'Medicine inventory updated.');
    }

    public function destroy(Medicine $medicine): RedirectResponse
    {
        $medicine->delete();

        return redirect()->back()->with('success', 'Medicine removed from inventory.');
    }
}
