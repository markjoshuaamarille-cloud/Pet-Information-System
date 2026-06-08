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
        $prefix = 'INV-'.now()->format('Ymd');
        $count = Billing::whereDate('created_at', today())->count() + 1;

        return sprintf('%s-%04d', $prefix, $count);
    }

    /**
     * Create a clinic-service invoice for a priced health record when none exists yet.
     */
    public static function createFromHealthRecord(HealthRecord $record): ?Billing
    {
        if ($record->billing_id || (float) $record->line_total <= 0 || ! $record->clinic_id) {
            return null;
        }

        $pet = $record->pet ?? Pet::find($record->pet_id);

        if (! $pet) {
            return null;
        }

        $billing = Billing::create([
            'clinic_id'          => $record->clinic_id,
            'invoice_number'     => self::generateInvoiceNumber(),
            'sale_type'          => 'clinic_service',
            'client_id'          => $pet->client_id,
            'pet_id'             => $record->pet_id,
            'service_catalog_id' => $record->service_catalog_id,
            'service_unit_price' => $record->unit_price ?? 0,
            'service_quantity'   => $record->quantity ?? 1,
            'subtotal'           => $record->line_total,
            'tax'                => 0,
            'discount'           => 0,
            'total_amount'       => $record->line_total,
            'amount_paid'        => 0,
            'status'             => 'unpaid',
            'notes'              => "Auto-generated from service: {$record->title}",
        ]);

        $record->update(['billing_id' => $billing->id]);

        return $billing;
    }

    public static function unbilledRecordsQuery(int $petId, ?int $clinicId): Builder
    {
        return HealthRecord::query()
            ->where('pet_id', $petId)
            ->whereNull('billing_id')
            ->where('line_total', '>', 0)
            ->when($clinicId, fn (Builder $query) => $query->where('clinic_id', $clinicId));
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
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
            ->whereNull('billing_id')
            ->where('line_total', '>', 0)
            ->when($clinicId, fn (Builder $scoped) => $scoped->where('clinic_id', $clinicId));
    }
}
