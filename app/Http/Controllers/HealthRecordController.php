<?php

namespace App\Http\Controllers;

use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\ServiceCatalog;
use App\Models\User;
use App\Support\ClinicServices;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HealthRecordController extends Controller
{
    private const ALLOWED_MEDICATION_CATEGORIES = ['medicine', 'supplement_vitamin'];

    public function store(Request $request, Pet $pet): RedirectResponse
    {
        $validated = $this->validatePayload($request);
        $medicationLines = $this->normalizedMedicationLines($validated);

        if ($error = $this->syncMedicationInventory([], $medicationLines)) {
            return redirect()
                ->route('pets.show', $pet)
                ->withErrors(['medication_quantity' => $error]);
        }

        if ($error = $this->applyStickerChanges($request, $validated)) {
            return redirect()
                ->route('pets.show', $pet)
                ->withErrors(['sticker_photo' => $error]);
        }

        unset($validated['sticker_photo'], $validated['remove_sticker_photo'], $validated['medication_lines']);

        $this->applyPricing($validated, $request->attributes->get('active_clinic_id'));

        $validated['clinic_id'] = $request->attributes->get('active_clinic_id');

        $record = $pet->healthRecords()->create($validated);

        \App\Support\ClinicBilling::createFromHealthRecord($record->fresh());

        return redirect()->route('pets.show', $pet)->with('success', 'Health record added successfully.');
    }

    public function update(Request $request, Pet $pet, HealthRecord $healthRecord): RedirectResponse
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);
        $this->ensureCanModifyHealthRecord($request, $healthRecord);

        $validated = $this->validatePayload($request);
        $previousMedicationLines = $this->medicationLinesFromRecord($healthRecord);
        $medicationLines = $this->normalizedMedicationLines($validated);

        if ($error = $this->syncMedicationInventory($previousMedicationLines, $medicationLines)) {
            return redirect()
                ->route('pets.show', $pet)
                ->withErrors(['medication_quantity' => $error]);
        }

        if ($error = $this->applyStickerChanges($request, $validated, $healthRecord)) {
            return redirect()
                ->route('pets.show', $pet)
                ->withErrors(['sticker_photo' => $error]);
        }

        unset($validated['sticker_photo'], $validated['remove_sticker_photo'], $validated['medication_lines']);

        $this->applyPricing($validated, $request->attributes->get('active_clinic_id'));

        $healthRecord->update($validated);

        $healthRecord = $healthRecord->fresh();

        if (! $healthRecord->billing_id) {
            \App\Support\ClinicBilling::createFromHealthRecord($healthRecord);
        }

        $this->refreshLinkedBilling($healthRecord);

        return redirect()->route('pets.show', $pet)->with('success', 'Health record updated successfully.');
    }

    public function destroy(Pet $pet, HealthRecord $healthRecord): RedirectResponse
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);
        $this->ensureCanModifyHealthRecord(request(), $healthRecord);

        if ($healthRecord->sticker_photo_path) {
            Storage::disk('s3')->delete($healthRecord->sticker_photo_path);
        }

        $healthRecord->delete();

        return redirect()->route('pets.show', $pet)->with('success', 'Health record removed.');
    }

    public function destroySticker(Pet $pet, HealthRecord $healthRecord): RedirectResponse
    {
        abort_unless($healthRecord->pet_id === $pet->id, 404);
        $this->ensureCanModifyHealthRecord(request(), $healthRecord);

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
                throw ValidationException::withMessages([
                    'medicine_id' => 'Add at least one medicine.',
                ]);
            }

            $validated['medicine_id'] = $lines[0]['medicine_id'];
            $validated['medication_quantity'] = $lines[0]['medication_quantity'];
            $validated['medication_lines'] = $lines;
            $validated['dosage'] = null;
        }

        return $validated;
    }

    /**
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

        $fromDescription = $this->parseMedicationLinesFromDescription($record->description);
        if ($fromDescription !== []) {
            return $fromDescription;
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
     * @return list<array{medicine_id: int, medication_quantity: int}>
     */
    private function parseMedicationLinesFromDescription(?string $description): array
    {
        if (! $description || ! str_contains($description, '__SERVICE_FIELDS__:')) {
            return [];
        }

        $marker = '__SERVICE_FIELDS__:';
        $json = substr($description, strpos($description, $marker) + strlen($marker));
        $details = json_decode($json, true);

        if (! is_array($details) || empty($details['medication_lines']) || ! is_array($details['medication_lines'])) {
            return [];
        }

        return array_values(array_map(fn (array $line) => [
            'medicine_id' => (int) $line['medicine_id'],
            'medication_quantity' => max((int) ($line['medication_quantity'] ?? 1), 1),
        ], $details['medication_lines']));
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

    /**
     * Resolve the service price, quantity, line total and catalog link for a
     * health record. Pricing auto-fills from Inventory (medication) or the
     * Service Catalog (other types), but a provided unit price is respected
     * so staff can override per record.
     */
    private function applyPricing(array &$validated, ?int $clinicId = null): void
    {
        $type = $validated['type'];
        $providedPrice = $validated['unit_price'] ?? null;

        if ($type === 'medication' && ! empty($validated['medicine_id'])) {
            $formQuantity = isset($validated['quantity']) ? (int) $validated['quantity'] : null;

            // Frontend sends the summed total as unit_price with quantity=1 for multi-line billing.
            if ($providedPrice !== null && $formQuantity === 1) {
                $validated['service_catalog_id'] = $validated['service_catalog_id'] ?? null;
                $validated['unit_price'] = (float) $providedPrice;
                $validated['quantity'] = 1;
                $validated['line_total'] = round((float) $providedPrice, 2);

                return;
            }

            $quantity = max((int) ($validated['medication_quantity'] ?? 1), 1);
            $medicineQuery = Medicine::query()->whereKey($validated['medicine_id']);
            if ($clinicId) {
                $medicineQuery->where('clinic_id', $clinicId);
            }
            $unitPrice = $providedPrice !== null
                ? (float) $providedPrice
                : (float) ($medicineQuery->value('unit_price') ?? 0);

            $validated['service_catalog_id'] = $validated['service_catalog_id'] ?? null;
            $validated['unit_price'] = $unitPrice;
            $validated['quantity'] = $quantity;
            $validated['line_total'] = round($unitPrice * $quantity, 2);

            return;
        }

        $catalogQuery = ServiceCatalog::query()
            ->where('code', ClinicServices::catalogCodeForType($type));
        if ($clinicId) {
            $catalogQuery->where('clinic_id', $clinicId);
        }
        $catalog = $catalogQuery->first();
        $quantity = max((int) ($validated['quantity'] ?? 1), 1);
        $unitPrice = $providedPrice !== null
            ? (float) $providedPrice
            : (float) ($catalog?->default_price ?? 0);

        $validated['service_catalog_id'] = $validated['service_catalog_id'] ?? $catalog?->id;
        $validated['unit_price'] = $unitPrice;
        $validated['quantity'] = $quantity;
        $validated['line_total'] = round($unitPrice * $quantity, 2);
    }

    /**
     * Keep an already-generated invoice in sync when one of its linked health
     * records is edited.
     */
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

    private function ensureCanModifyHealthRecord(Request $request, HealthRecord $healthRecord): void
    {
        $user = $request->user();
        $activeClinicId = $request->attributes->get('active_clinic_id');

        if ($user instanceof User && $user->isPlatformAdmin() && ! $activeClinicId) {
            return;
        }

        if (! $activeClinicId) {
            abort(403, 'Select a clinic to modify health records.');
        }

        if ($healthRecord->clinic_id === null) {
            return;
        }

        if ((int) $healthRecord->clinic_id !== (int) $activeClinicId) {
            abort(403, 'You can only edit or delete health records created by your active clinic.');
        }
    }
}
