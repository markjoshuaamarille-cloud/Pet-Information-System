<?php

namespace App\Http\Controllers;

use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Support\ClinicServices;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HealthRecordController extends Controller
{
    private const ALLOWED_MEDICATION_CATEGORIES = ['medicine', 'supplement_vitamin'];

    public function store(Request $request, Pet $pet): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ClinicServices::healthRecordTypeValidationRule(),
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'medicine_id' => [
                'required_if:type,medication',
                'nullable',
                Rule::exists('medicines', 'id')->where(
                    fn ($query) => $query->whereIn('category', self::ALLOWED_MEDICATION_CATEGORIES)
                ),
            ],
            'dosage' => 'nullable|string|max:255',
            'medication_quantity' => 'nullable|integer|min:1',
            'record_date' => 'required|date',
            'next_due_date' => 'nullable|date|after_or_equal:record_date',
            'veterinarian_notes' => 'nullable|string',
        ]);

        if ($validated['type'] !== 'medication') {
            $validated['medicine_id'] = null;
            $validated['dosage'] = null;
            $validated['medication_quantity'] = null;
        } else {
            $request->validate([
                'medication_quantity' => 'required|integer|min:1',
            ]);
        }

        $medicine = null;
        if ($validated['type'] === 'medication' && ! empty($validated['medicine_id'])) {
            $medicine = Medicine::find($validated['medicine_id']);

            if (! $medicine || $medicine->quantity < $validated['medication_quantity']) {
                return redirect()
                    ->route('pets.show', $pet)
                    ->withErrors([
                        'medication_quantity' => 'Insufficient medicine inventory for the requested quantity.',
                    ]);
            }
        }

        $pet->healthRecords()->create($validated);

        if ($medicine) {
            $medicine->decrement('quantity', $validated['medication_quantity']);
        }

        return redirect()->route('pets.show', $pet)->with('success', 'Health record added successfully.');
    }

    public function destroy(Pet $pet, HealthRecord $healthRecord): RedirectResponse
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);
        $healthRecord->delete();

        return redirect()->route('pets.show', $pet)->with('success', 'Health record removed.');
    }
}
