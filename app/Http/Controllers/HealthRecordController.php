<?php

namespace App\Http\Controllers;

use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Support\ClinicServices;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HealthRecordController extends Controller
{
    private const ALLOWED_MEDICATION_CATEGORIES = ['medicine', 'supplement_vitamin'];

    public function store(Request $request, Pet $pet): RedirectResponse
    {
        $validated = $this->validatePayload($request);

        if ($error = $this->medicationInventoryError($validated)) {
            return redirect()
                ->route('pets.show', $pet)
                ->withErrors(['medication_quantity' => $error]);
        }

        if ($error = $this->applyStickerChanges($request, $validated)) {
            return redirect()
                ->route('pets.show', $pet)
                ->withErrors(['sticker_photo' => $error]);
        }

        unset($validated['sticker_photo'], $validated['remove_sticker_photo']);

        $pet->healthRecords()->create($validated);

        if ($validated['type'] === 'medication' && ! empty($validated['medicine_id'])) {
            Medicine::whereKey($validated['medicine_id'])
                ->decrement('quantity', $validated['medication_quantity']);
        }

        return redirect()->route('pets.show', $pet)->with('success', 'Health record added successfully.');
    }

    public function update(Request $request, Pet $pet, HealthRecord $healthRecord): RedirectResponse
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);

        $validated = $this->validatePayload($request);

        if ($error = $this->medicationInventoryError($validated, $healthRecord)) {
            return redirect()
                ->route('pets.show', $pet)
                ->withErrors(['medication_quantity' => $error]);
        }

        if ($error = $this->applyStickerChanges($request, $validated, $healthRecord)) {
            return redirect()
                ->route('pets.show', $pet)
                ->withErrors(['sticker_photo' => $error]);
        }

        unset($validated['sticker_photo'], $validated['remove_sticker_photo']);

        if ($healthRecord->type === 'medication' && $healthRecord->medicine_id && $healthRecord->medication_quantity) {
            Medicine::whereKey($healthRecord->medicine_id)
                ->increment('quantity', $healthRecord->medication_quantity);
        }

        $healthRecord->update($validated);

        if ($validated['type'] === 'medication' && ! empty($validated['medicine_id'])) {
            Medicine::whereKey($validated['medicine_id'])
                ->decrement('quantity', $validated['medication_quantity']);
        }

        return redirect()->route('pets.show', $pet)->with('success', 'Health record updated successfully.');
    }

    public function destroy(Pet $pet, HealthRecord $healthRecord): RedirectResponse
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);

        if ($healthRecord->type === 'medication' && $healthRecord->medicine_id && $healthRecord->medication_quantity) {
            Medicine::whereKey($healthRecord->medicine_id)
                ->increment('quantity', $healthRecord->medication_quantity);
        }

        if ($healthRecord->sticker_photo_path) {
            Storage::disk('s3')->delete($healthRecord->sticker_photo_path);
        }

        $healthRecord->delete();

        return redirect()->route('pets.show', $pet)->with('success', 'Health record removed.');
    }

    public function destroySticker(Pet $pet, HealthRecord $healthRecord): RedirectResponse
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);

        if ($healthRecord->sticker_photo_path) {
            Storage::disk('s3')->delete($healthRecord->sticker_photo_path);
            $healthRecord->update(['sticker_photo_path' => null]);
        }

        return redirect()->route('pets.show', $pet)->with('success', 'Vaccine sticker removed.');
    }

    private function validatePayload(Request $request): array
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
            'sticker_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'remove_sticker_photo' => 'nullable|boolean',
        ]);

        if ($request->hasFile('sticker_photo') && $validated['type'] !== 'vaccination') {
            throw ValidationException::withMessages([
                'sticker_photo' => 'Sticker photos are only allowed for vaccination records.',
            ]);
        }

        if ($validated['type'] !== 'medication') {
            $validated['medicine_id'] = null;
            $validated['dosage'] = null;
            $validated['medication_quantity'] = null;
        } else {
            $request->validate([
                'medication_quantity' => 'required|integer|min:1',
            ]);
        }

        return $validated;
    }

    private function medicationInventoryError(array $validated, ?HealthRecord $existing = null): ?string
    {
        if ($validated['type'] !== 'medication' || empty($validated['medicine_id'])) {
            return null;
        }

        $medicine = Medicine::find($validated['medicine_id']);

        if (! $medicine) {
            return 'Selected medicine was not found.';
        }

        $available = $medicine->quantity;

        if ($existing
            && $existing->type === 'medication'
            && (int) $existing->medicine_id === (int) $validated['medicine_id']
        ) {
            $available += (int) $existing->medication_quantity;
        }

        if ($available < (int) $validated['medication_quantity']) {
            return 'Insufficient medicine inventory for the requested quantity.';
        }

        return null;
    }

    private function applyStickerChanges(
        Request $request,
        array &$validated,
        ?HealthRecord $existing = null,
    ): ?string {
        $existingPath = $existing?->sticker_photo_path;

        if ($request->hasFile('sticker_photo')) {
            return $this->uploadStickerPhoto($request, $validated, $existingPath);
        }

        if ($request->boolean('remove_sticker_photo') && $existingPath) {
            $this->deleteStickerFile($existingPath);
            $validated['sticker_photo_path'] = null;
        }

        return null;
    }

    private function uploadStickerPhoto(
        Request $request,
        array &$validated,
        ?string $existingPath = null,
    ): ?string {
        $path = $request->file('sticker_photo')->store('pets/vaccination-stickers', 's3');

        if (! $path) {
            return 'Failed to upload vaccine sticker photo. Please try again.';
        }

        if ($existingPath) {
            $this->deleteStickerFile($existingPath);
        }

        $validated['sticker_photo_path'] = $path;

        return null;
    }

    private function deleteStickerFile(?string $path): void
    {
        if (! $path || $path === '0') {
            return;
        }

        Storage::disk('s3')->delete($path);
    }
}
