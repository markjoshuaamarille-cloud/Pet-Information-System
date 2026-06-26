<?php

namespace App\Support;

use App\Models\PlatformCommission;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class PlatformCommissionReportBuilder
{
    public function __construct(
        private readonly string $period = 'monthly',
        private readonly ?string $dateFrom = null,
        private readonly ?string $dateTo = null,
        private readonly ?int $clinicId = null,
        private readonly ?string $businessLine = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $useCustomRange = (bool) ($this->dateFrom || $this->dateTo);

        return [
            'summary' => $this->summary(),
            'by_clinic' => $this->byClinic(),
            'by_business_line' => $this->byBusinessLine(),
            'unsettled_by_clinic' => $this->unsettledByClinic(),
            'transactions' => $this->transactions(),
            'unsettled_transactions' => $this->unsettledTransactions(),
            'settlements' => $this->recentSettlements(),
            'filters' => [
                'period' => $this->period,
                'date_from' => $this->dateFrom,
                'date_to' => $this->dateTo,
                'clinic_id' => $this->clinicId,
                'business_line' => $this->businessLine,
                'using_custom_range' => $useCustomRange,
            ],
        ];
    }

    /**
     * @return array<string, float|int>
     */
    public function summary(): array
    {
        $query = $this->commissionQuery();
        $totals = $query->select([
            DB::raw('COUNT(*) as transaction_count'),
            DB::raw('SUM(transaction_amount) as total_gross'),
            DB::raw('SUM(commission_amount) as total_commission'),
            DB::raw('SUM(business_earnings) as total_business_earnings'),
        ])->first();

        $unsettled = $this->unsettledQuery()->select([
            DB::raw('SUM(commission_amount) as unsettled_commission'),
        ])->first();

        $settled = PlatformCommission::query()
            ->whereNotNull('settlement_id')
            ->when($this->clinicId, fn ($q) => $q->where('clinic_id', $this->clinicId))
            ->select([DB::raw('SUM(commission_amount) as settled_commission')])
            ->first();

        return [
            'transaction_count' => (int) ($totals->transaction_count ?? 0),
            'total_gross' => round((float) ($totals->total_gross ?? 0), 2),
            'total_commission' => round((float) ($totals->total_commission ?? 0), 2),
            'total_business_earnings' => round((float) ($totals->total_business_earnings ?? 0), 2),
            'unsettled_commission' => round((float) ($unsettled->unsettled_commission ?? 0), 2),
            'settled_commission' => round((float) ($settled->settled_commission ?? 0), 2),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function byClinic(): array
    {
        return $this->commissionQuery()
            ->join('clinics', 'platform_commissions.clinic_id', '=', 'clinics.id')
            ->select([
                'clinics.id as clinic_id',
                'clinics.name as clinic_name',
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(transaction_amount) as total_gross'),
                DB::raw('SUM(commission_amount) as total_commission'),
                DB::raw('SUM(business_earnings) as total_business_earnings'),
            ])
            ->groupBy('clinics.id', 'clinics.name')
            ->orderByDesc('total_commission')
            ->get()
            ->map(fn ($row) => [
                'clinic_id' => (int) $row->clinic_id,
                'clinic_name' => (string) $row->clinic_name,
                'transaction_count' => (int) $row->transaction_count,
                'total_gross' => round((float) $row->total_gross, 2),
                'total_commission' => round((float) $row->total_commission, 2),
                'total_business_earnings' => round((float) $row->total_business_earnings, 2),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function byBusinessLine(): array
    {
        $labels = [
            'veterinary' => 'Veterinary Clinic',
            'pet_shop' => 'Pet Shop',
            'grooming' => 'Grooming',
        ];

        return $this->commissionQuery()
            ->select([
                'business_line',
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(transaction_amount) as total_gross'),
                DB::raw('SUM(commission_amount) as total_commission'),
                DB::raw('SUM(business_earnings) as total_business_earnings'),
            ])
            ->groupBy('business_line')
            ->orderBy('business_line')
            ->get()
            ->map(fn ($row) => [
                'business_line' => (string) $row->business_line,
                'label' => $labels[$row->business_line] ?? ucfirst((string) $row->business_line),
                'transaction_count' => (int) $row->transaction_count,
                'total_gross' => round((float) $row->total_gross, 2),
                'total_commission' => round((float) $row->total_commission, 2),
                'total_business_earnings' => round((float) $row->total_business_earnings, 2),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function unsettledByClinic(): array
    {
        return $this->unsettledQuery()
            ->join('clinics', 'platform_commissions.clinic_id', '=', 'clinics.id')
            ->select([
                'clinics.id as clinic_id',
                'clinics.name as clinic_name',
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(commission_amount) as unsettled_commission'),
            ])
            ->groupBy('clinics.id', 'clinics.name')
            ->orderByDesc('unsettled_commission')
            ->get()
            ->map(fn ($row) => [
                'clinic_id' => (int) $row->clinic_id,
                'clinic_name' => (string) $row->clinic_name,
                'transaction_count' => (int) $row->transaction_count,
                'unsettled_commission' => round((float) $row->unsettled_commission, 2),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function unsettledTransactions(): array
    {
        return $this->unsettledQuery()
            ->with(['clinic:id,name', 'billing:id,invoice_number', 'payment:id,paid_at'])
            ->orderByDesc('transaction_at')
            ->get()
            ->map(fn (PlatformCommission $commission) => $this->mapTransactionRow($commission))
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function transactions(): array
    {
        return $this->commissionQuery()
            ->with(['clinic:id,name', 'billing:id,invoice_number', 'payment:id,paid_at'])
            ->orderByDesc('transaction_at')
            ->limit(200)
            ->get()
            ->map(fn (PlatformCommission $commission) => $this->mapTransactionRow($commission))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function mapTransactionRow(PlatformCommission $commission): array
    {
        return [
            'id' => $commission->id,
            'clinic_id' => $commission->clinic_id,
            'clinic_name' => $commission->clinic?->name,
            'invoice_number' => $commission->invoice_number,
            'business_line' => $commission->business_line,
            'business_line_label' => $commission->businessLineLabel(),
            'sale_type' => $commission->sale_type,
            'transaction_amount' => (float) $commission->transaction_amount,
            'commission_rate' => (float) $commission->commission_rate,
            'commission_amount' => (float) $commission->commission_amount,
            'business_earnings' => (float) $commission->business_earnings,
            'transaction_at' => self::formatTransactionAt(
                $commission->payment?->paid_at ?? $commission->transaction_at,
            ),
            'is_settled' => $commission->settlement_id !== null,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function recentSettlements(): array
    {
        return \App\Models\PlatformCommissionSettlement::query()
            ->with('clinic:id,name')
            ->when($this->clinicId, fn ($q) => $q->where('clinic_id', $this->clinicId))
            ->orderByDesc('paid_at')
            ->limit(50)
            ->get()
            ->map(fn ($settlement) => [
                'id' => $settlement->id,
                'receipt_number' => $settlement->receipt_number,
                'clinic_id' => $settlement->clinic_id,
                'clinic_name' => $settlement->clinic?->name,
                'transaction_count' => $settlement->transaction_count,
                'total_commission' => (float) $settlement->total_commission,
                'amount_received' => (float) $settlement->amount_received,
                'paid_at' => self::formatTransactionAt($settlement->paid_at),
            ])
            ->all();
    }

    private function commissionQuery(): Builder
    {
        return PlatformCommission::query()
            ->when($this->clinicId, fn ($q) => $q->where('clinic_id', $this->clinicId))
            ->when($this->businessLine, fn ($q) => $q->where('business_line', $this->businessLine))
            ->when($this->dateFrom || $this->dateTo, function ($query): void {
                $timezone = config('app.timezone');
                $dateFrom = $this->dateFrom;
                $dateTo = $this->dateTo;

                $query->whereHas('payment', function ($paymentQuery) use ($timezone, $dateFrom, $dateTo): void {
                    if ($dateFrom && $dateTo) {
                        $start = Carbon::parse($dateFrom, $timezone)->startOfDay();
                        $end = Carbon::parse($dateTo, $timezone)->endOfDay();
                        $paymentQuery->whereBetween('paid_at', [$start, $end]);

                        return;
                    }

                    if ($dateFrom) {
                        $start = Carbon::parse($dateFrom, $timezone)->startOfDay();
                        $paymentQuery->where('paid_at', '>=', $start);
                    }

                    if ($dateTo) {
                        $end = Carbon::parse($dateTo, $timezone)->endOfDay();
                        $paymentQuery->where('paid_at', '<=', $end);
                    }
                });
            })
            ->when(! $this->dateFrom && ! $this->dateTo && $this->period, function ($query): void {
                $start = match ($this->period) {
                    'daily' => now()->startOfDay(),
                    'weekly' => now()->startOfWeek(),
                    'monthly' => now()->startOfMonth(),
                    'yearly' => now()->startOfYear(),
                    default => null,
                };

                if ($start) {
                    $query->whereHas('payment', fn ($paymentQuery) => $paymentQuery->where('paid_at', '>=', $start));
                }
            });
    }

    private function unsettledQuery(): Builder
    {
        return PlatformCommission::query()
            ->whereNull('settlement_id')
            ->when($this->clinicId, fn ($q) => $q->where('clinic_id', $this->clinicId));
    }

    private static function formatTransactionAt(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return Carbon::parse($value)
            ->timezone(config('app.timezone'))
            ->format('Y-m-d\TH:i:sP');
    }
}
