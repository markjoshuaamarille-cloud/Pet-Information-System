<?php

namespace App\Services;

use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\ServiceCatalog;
use App\Support\ClinicServices;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HealthRecordService
{
    private const ALLOWED_MEDICATION_CATEGORIES = ['medicine', 'supplement_vitamin'];

    public function store(Request $request, Pet $pet): HealthRecord
    {
        $validated = $this->validatePayload($request);
        $medicationLines = $this->normalizedMedicationLines($validated);

        if ($error = $this->syncMedicationInventory([], $medicationLines)) {
            throw ValidationException::withMessages(['medication_quantity' => $error]);
        }

        if ($error = $this->applyStickerChanges($request, $validated)) {
            throw ValidationException::withMessages(['sticker_photo' => $error]);
        }

        unset($validated['sticker_photo'], $validated['remove_sticker_photo'], $validated['medication_lines']);
        $this->applyPricing($validated);

        return $pet->healthRecords()->create($validated);
    }

    public function update(Request $request, Pet $pet, HealthRecord $healthRecord): HealthRecord
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);

        $validated = $this->validatePayload($request);
        $previousMedicationLines = $this->medicationLinesFromRecord($healthRecord);
        $medicationLines = $this->normalizedMedicationLines($validated);

        if ($error = $this->syncMedicationInventory($previousMedicationLines, $medicationLines)) {
            throw ValidationException::withMessages(['medication_quantity' => $error]);
        }

        if ($error = $this->applyStickerChanges($request, $validated, $healthRecord)) {
            throw ValidationException::withMessages(['sticker_photo' => $error]);
        }

        unset($validated['sticker_photo'], $validated['remove_sticker_photo'], $validated['medication_lines']);
        $this->applyPricing($validated);
        $healthRecord->update($validated);
        $this->refreshLinkedBilling($healthRecord->fresh());

        return $healthRecord->fresh(['medicine', 'serviceCatalog']);
    }

    public function destroy(Pet $pet, HealthRecord $healthRecord): void
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);

        if ($healthRecord->sticker_photo_path) {
            Storage::disk('s3')->delete($healthRecord->sticker_photo_path);
        }

        $healthRecord->delete();
    }

    public function destroySticker(Pet $pet, HealthRecord $healthRecord): HealthRecord
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);

        if ($healthRecord->sticker_photo_path) {
            Storage::disk('s3')->delete($healthRecord->sticker_photo_path);
            $healthRecord->update(['sticker_photo_path' => null]);
        }

        return $healthRecord->fresh();
    }

    /**
     * @return array<string, mixed>
     */
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
            'medication_lines' => 'nullable|array',
            'medication_lines.*.medicine_id' => 'required|exists:medicines,id',
            'medication_lines.*.medication_quantity' => 'required|integer|min:1',
            'service_catalog_id' => 'nullable|exists:service_catalogs,id',
            'unit_price' => 'nullable|numeric|min:0',
            'quantity' => 'nullable|integer|min:1',
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
            $lines = $this->normalizedMedicationLines($validated);
            if ($lines === []) {
                throw ValidationException::withMessages(['medicine_id' => 'Add at least one medicine.']);
            }

            $validated['medicine_id'] = $lines[0]['medicine_id'];
            $validated['medication_quantity'] = $lines[0]['medication_quantity'];
            $validated['medication_lines'] = $lines;
            $validated['dosage'] = null;
        }

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return list<array{medicine_id: int, medication_quantity: int}>
     */
    private function normalizedMedicationLines(array $validated): array
    {
        if (($validated['type'] ?? null) !== 'medication') {
            return [];
        }

        if (! empty($validated['medication_lines']) && is_array($validated['medication_lines'])) {
            return array_values(array_map(fn (array $line) => [
                'medicine_id' => (int) $line['medicine_id'],
                'medication_quantity' => max((int) ($line['medication_quantity'] ?? 1), 1),
            ], $validated['medication_lines']));
        }

        if (! empty($validated['medicine_id'])) {
            return [[
                'medicine_id' => (int) $validated['medicine_id'],
                'medication_quantity' => max((int) ($validated['medication_quantity'] ?? 1), 1),
            ]];
        }

        return [];
    }

    /**
     * @return list<array{medicine_id: int, medication_quantity: int}>
     */
    private function medicationLinesFromRecord(HealthRecord $record): array
    {
        if ($record->type !== 'medication') {
            return [];
        }

        if ($record->medicine_id) {
            return [[
                'medicine_id' => (int) $record->medicine_id,
                'medication_quantity' => max((int) $record->medication_quantity, 1),
            ]];
        }

        return [];
    }

    /**
     * @param  list<array{medicine_id: int, medication_quantity: int}>  $previousLines
     * @param  list<array{medicine_id: int, medication_quantity: int}>  $newLines
     */
    private function syncMedicationInventory(array $previousLines, array $newLines): ?string
    {
        if ($previousLines === [] && $newLines === []) {
            return null;
        }

        $needed = [];
        foreach ($newLines as $line) {
            $medicineId = $line['medicine_id'];
            $needed[$medicineId] = ($needed[$medicineId] ?? 0) + $line['medication_quantity'];
        }

        $returning = [];
        foreach ($previousLines as $line) {
            $medicineId = $line['medicine_id'];
            $returning[$medicineId] = ($returning[$medicineId] ?? 0) + $line['medication_quantity'];
        }

        $medicineIds = array_unique(array_merge(array_keys($needed), array_keys($returning)));

        return DB::transaction(function () use ($medicineIds, $needed, $returning) {
            foreach ($medicineIds as $medicineId) {
                $medicine = Medicine::whereKey($medicineId)->lockForUpdate()->first();

                if (! $medicine) {
                    return 'Selected medicine was not found.';
                }

                $available = $medicine->quantity + ($returning[$medicineId] ?? 0);
                if ($available < ($needed[$medicineId] ?? 0)) {
                    return 'Insufficient medicine inventory for the requested quantity.';
                }
            }

            foreach ($medicineIds as $medicineId) {
                $medicine = Medicine::whereKey($medicineId)->lockForUpdate()->first();
                $delta = ($needed[$medicineId] ?? 0) - ($returning[$medicineId] ?? 0);

                if ($delta > 0) {
                    $medicine->decrement('quantity', $delta);
                } elseif ($delta < 0) {
                    $medicine->increment('quantity', abs($delta));
                }
            }

            return null;
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function applyStickerChanges(Request $request, array &$validated, ?HealthRecord $existing = null): ?string
    {
        $existingPath = $existing?->sticker_photo_path;

        if ($request->hasFile('sticker_photo')) {
            $path = $request->file('sticker_photo')->store('pets/vaccination-stickers', 's3');

            if (! $path) {
                return 'Failed to upload vaccine sticker photo. Please try again.';
            }

            if ($existingPath) {
                Storage::disk('s3')->delete($existingPath);
            }

            $validated['sticker_photo_path'] = $path;

            return null;
        }

        if ($request->boolean('remove_sticker_photo') && $existingPath) {
            Storage::disk('s3')->delete($existingPath);
            $validated['sticker_photo_path'] = null;
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function applyPricing(array &$validated): void
    {
        $type = $validated['type'];
        $providedPrice = $validated['unit_price'] ?? null;

        if ($type === 'medication' && ! empty($validated['medicine_id'])) {
            $formQuantity = isset($validated['quantity']) ? (int) $validated['quantity'] : null;

            if ($providedPrice !== null && $formQuantity === 1) {
                $validated['service_catalog_id'] = $validated['service_catalog_id'] ?? null;
                $validated['unit_price'] = (float) $providedPrice;
                $validated['quantity'] = 1;
                $validated['line_total'] = round((float) $providedPrice, 2);

                return;
            }

            $quantity = max((int) ($validated['medication_quantity'] ?? 1), 1);
            $unitPrice = $providedPrice !== null
                ? (float) $providedPrice
                : (float) (Medicine::find($validated['medicine_id'])?->unit_price ?? 0);

            $validated['service_catalog_id'] = $validated['service_catalog_id'] ?? null;
            $validated['unit_price'] = $unitPrice;
            $validated['quantity'] = $quantity;
            $validated['line_total'] = round($unitPrice * $quantity, 2);

            return;
        }

        $catalog = ServiceCatalog::where('code', ClinicServices::catalogCodeForType($type))->first();
        $quantity = max((int) ($validated['quantity'] ?? 1), 1);
        $unitPrice = $providedPrice !== null
            ? (float) $providedPrice
            : (float) ($catalog?->default_price ?? 0);

        $validated['service_catalog_id'] = $validated['service_catalog_id'] ?? $catalog?->id;
        $validated['unit_price'] = $unitPrice;
        $validated['quantity'] = $quantity;
        $validated['line_total'] = round($unitPrice * $quantity, 2);
    }

    private function refreshLinkedBilling(?HealthRecord $healthRecord): void
    {
        $billing = $healthRecord?->billing;

        if (! $billing) {
            return;
        }

        $subtotal = (float) $billing->healthRecords()->sum('line_total');
        $tax = (float) $billing->tax;
        $discount = (float) $billing->discount;
        $total = max($subtotal + $tax - $discount, 0);

        $status = $billing->status;
        if ($status !== 'cancelled') {
            $paid = (float) $billing->amount_paid;
            $status = $paid <= 0 ? 'unpaid' : ($paid < $total ? 'partial' : 'paid');
        }

        $billing->update([
            'subtotal' => $subtotal,
            'total_amount' => $total,
            'status' => $status,
        ]);
    }
}
