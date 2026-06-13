<?php

namespace App\Support;

use App\Models\Billing;
use App\Models\HealthRecord;
use App\Models\Pet;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ClinicBilling
{
    public static function generateInvoiceNumber(): string
    {
        return InvoiceNumberGenerator::generate();
    }

    /**
     * @return array<string, mixed>
     */
    public static function serviceDetailsFromDescription(?string $description): array
    {
        if (! $description || ! str_contains($description, '__SERVICE_FIELDS__:')) {
            return [];
        }

        $marker = '__SERVICE_FIELDS__:';
        $json = substr($description, strpos($description, $marker) + strlen($marker));
        $details = json_decode($json, true);

        return is_array($details) ? $details : [];
    }

    public static function unbilledRecordsQuery(int $petId, ?int $clinicId): Builder
    {
        return HealthRecord::query()
            ->where('pet_id', $petId)
            ->billableForCheckout()
            ->when($clinicId, fn (Builder $query) => $query->where('clinic_id', $clinicId));
    }

    /**
     * Sum the subtotal / tax / discount breakdown across a set of unbilled
     * health records so a combined invoice preserves the VAT and discount the
     * staff entered per service line.
     *
     * @param  Collection<int, HealthRecord>  $records
     * @return array{subtotal: float, tax: float, discount: float, total: float, tax_applied: bool, tax_rate: float}
     */
    public static function aggregateServiceCharges(Collection $records): array
    {
        $subtotal = 0.0;
        $tax = 0.0;
        $discount = 0.0;
        $total = 0.0;
        $taxApplied = false;
        $taxRate = 0.0;

        foreach ($records as $record) {
            $details = self::serviceDetailsFromDescription($record->description);
            $lineTotal = (float) $record->line_total;

            $subtotal += (float) ($details['billing_subtotal'] ?? $lineTotal);
            $tax += (float) ($details['billing_tax_amount'] ?? 0);
            $discount += (float) ($details['billing_discount'] ?? 0);
            $total += $lineTotal;

            if (! empty($details['billing_tax_enabled'])) {
                $taxApplied = true;
                $taxRate = (float) ($details['billing_tax_rate'] ?? $taxRate);
            }
        }

        return [
            'subtotal'    => round($subtotal, 2),
            'tax'         => round($tax, 2),
            'discount'    => round($discount, 2),
            'total'       => round($total, 2),
            'tax_applied' => $taxApplied,
            'tax_rate'    => $taxRate,
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    /**
     * All unbilled priced health records for checkout selection.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public static function unbilledRecordsList(?int $clinicId): Collection
    {
        return HealthRecord::query()
            ->with(['pet.client:id,name', 'serviceCatalog:id,name'])
            ->when($clinicId, fn (Builder $query) => $query->where('clinic_id', $clinicId))
            ->billableForCheckout()
            ->orderByDesc('record_date')
            ->orderByDesc('id')
            ->get()
            ->map(function (HealthRecord $record) {
                $details = self::serviceDetailsFromDescription($record->description);
                $lineTotal = (float) $record->line_total;

                return [
                    'id'             => $record->id,
                    'appointment_id' => $record->appointment_id,
                    'pet_id'       => $record->pet_id,
                    'pet_name'     => $record->pet?->pet_name,
                    'client_id'    => $record->pet?->client_id,
                    'client_name'  => $record->pet?->client?->name,
                    'title'        => $record->title,
                    'type'         => $record->type,
                    'record_date'  => $record->record_date?->toDateString(),
                    'line_total'   => $lineTotal,
                    'unit_price'   => (float) $record->unit_price,
                    'quantity'     => (int) $record->quantity,
                    'subtotal'     => (float) ($details['billing_subtotal'] ?? $lineTotal),
                    'tax_amount'   => (float) ($details['billing_tax_amount'] ?? 0),
                    'discount'     => (float) ($details['billing_discount'] ?? 0),
                    'service_name' => $record->serviceCatalog?->name,
                ];
            })
            ->values();
    }

    /**
     * Suggested invoice-level tax and discount from a set of health records.
     *
     * @param  Collection<int, HealthRecord>  $records
     * @return array{subtotal: float, tax: float, discount: float}
     */
    public static function suggestedChargesFromRecords(Collection $records): array
    {
        $subtotal = 0.0;
        $tax = 0.0;
        $discount = 0.0;

        foreach ($records as $record) {
            $details = self::serviceDetailsFromDescription($record->description);
            $lineTotal = (float) $record->line_total;

            $subtotal += (float) ($details['billing_subtotal'] ?? $lineTotal);
            $tax += (float) ($details['billing_tax_amount'] ?? 0);
            $discount += (float) ($details['billing_discount'] ?? 0);
        }

        return [
            'subtotal' => round($subtotal, 2),
            'tax'      => round($tax, 2),
            'discount' => round($discount, 2),
        ];
    }

    /**
     * @param  array<int, array{description: string, quantity: int, unit_price: float|int|string}>  $extraLines
     * @return array{subtotal: float, tax: float, discount: float, total: float, tax_applied: bool, tax_rate: float}
     */
    public static function checkoutTotals(Collection $records, array $extraLines, float $invoiceTax, float $invoiceDiscount): array
    {
        $suggested = self::suggestedChargesFromRecords($records);

        $extraSubtotal = 0.0;
        foreach ($extraLines as $line) {
            $qty = max((int) ($line['quantity'] ?? 1), 1);
            $unitPrice = (float) ($line['unit_price'] ?? 0);
            $extraSubtotal += round($unitPrice * $qty, 2);
        }

        $subtotal = round($suggested['subtotal'] + $extraSubtotal, 2);
        $tax = round($invoiceTax, 2);
        $discount = round($invoiceDiscount, 2);
        $total = max(round($subtotal + $tax - $discount, 2), 0);

        $taxApplied = $tax > 0;
        $taxRate = 0.0;
        if ($taxApplied && $subtotal > 0) {
            $taxRate = round(($tax / $subtotal) * 100, 2);
        }

        return [
            'subtotal'    => $subtotal,
            'tax'         => $tax,
            'discount'    => $discount,
            'total'       => $total,
            'tax_applied' => $taxApplied,
            'tax_rate'    => $taxRate,
        ];
    }

    public static function billablePets(?int $clinicId): Collection
    {
        return Pet::with('client:id,name')
            ->whereHas('healthRecords', fn (Builder $query) => self::unbilledRecordsQueryForRelation($query, $clinicId))
            ->withSum(
                ['healthRecords as unbilled_total' => fn (Builder $query) => self::unbilledRecordsQueryForRelation($query, $clinicId)],
                'line_total'
            )
            ->withCount(
                ['healthRecords as unbilled_count' => fn (Builder $query) => self::unbilledRecordsQueryForRelation($query, $clinicId)]
            )
            ->orderBy('pet_name')
            ->get()
            ->map(fn (Pet $pet) => [
                'id'             => $pet->id,
                'pet_name'       => $pet->pet_name,
                'client_name'    => $pet->client?->name,
                'unbilled_total' => (float) $pet->unbilled_total,
                'unbilled_count' => (int) $pet->unbilled_count,
            ])
            ->values();
    }

    public static function clinicServiceBillingsQuery(?int $clinicId): Builder
    {
        return Billing::query()
            ->where(fn (Builder $query) => $query
                ->where('sale_type', 'clinic_service')
                ->orWhereNull('sale_type'))
            ->forClinic($clinicId);
    }

    private static function unbilledRecordsQueryForRelation(Builder $query, ?int $clinicId): Builder
    {
        return $query
            ->billableForCheckout()
            ->when($clinicId, fn (Builder $scoped) => $scoped->where('clinic_id', $clinicId));
    }
}
