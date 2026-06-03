<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\MedicineResource;
use App\Models\Medicine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @group Medicines
 *
 * Inventory management. Staff only.
 */
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

    public function index(): JsonResponse
    {
        $medicines = Medicine::orderBy('name')->get()->map(fn (Medicine $m) => $m->setAttribute('stock_status', $m->stockStatus()));

        return $this->success(['medicines' => MedicineResource::collection($medicines)]);
    }

    public function store(Request $request): JsonResponse
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

        $medicine = Medicine::create($validated);

        return $this->created(['medicine' => new MedicineResource($medicine)]);
    }

    public function update(Request $request, Medicine $medicine): JsonResponse
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

        return $this->success(['medicine' => new MedicineResource($medicine->fresh())], 'Medicine inventory updated.');
    }

    public function destroy(Medicine $medicine): JsonResponse
    {
        $medicine->delete();

        return $this->deleted('Medicine removed from inventory.');
    }
}
