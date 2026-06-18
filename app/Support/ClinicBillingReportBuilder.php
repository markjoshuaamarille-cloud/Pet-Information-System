<?php

namespace App\Support;

use App\Models\Billing;
use App\Models\BillingLineItem;
use App\Models\HealthRecord;
use App\Models\Payment;
use App\Models\ServiceCatalog;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ClinicBillingReportBuilder
{
    public function __construct(
        private readonly ?int $clinicId,
        private readonly string $period = 'monthly',
        private readonly ?string $dateFrom = null,
        private readonly ?string $dateTo = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $useCustomRange = $this->dateFrom && $this->dateTo;

        return [
            'summary' => $this->summary(),
            'sales_trend' => $this->salesTrend(),
            'category_revenue' => $this->categoryRevenue(),
            'payment_methods' => $this->paymentMethods(),
            'top_customers' => $this->topCustomers(),
            'zero_sales' => $this->zeroSalesServices(),
            'outstanding' => $this->outstandingInvoices(),
            'report_data' => $useCustomRange
                ? $this->serviceMovementForRange()
                : $this->serviceMovementByPeriod(),
            'filters' => [
                'period' => $this->period,
                'date_from' => $this->dateFrom,
                'date_to' => $this->dateTo,
                'using_custom_range' => $useCustomRange,
            ],
        ];
    }

    /**
     * @return array<string, float|int>
     */
    public function summary(): array
    {
        $orders = $this->billingQuery()->get(['id', 'total_amount']);

        $unitsSold = (int) $this->lineItemQuery()
            ->sum('billing_line_items.quantity');

        $totalRevenue = round((float) $orders->sum('total_amount'), 2);
        $orderCount = $orders->count();

        return [
            'total_revenue' => $totalRevenue,
            'total_orders' => $orderCount,
            'units_sold' => $unitsSold,
            'avg_order_value' => $orderCount > 0
                ? round($totalRevenue / $orderCount, 2)
                : 0,
        ];
    }

    /**
     * @return list<array{label: string, revenue: float, orders: int}>
     */
    public function salesTrend(): array
    {
        $dateFormat = $this->dateFormat();

        return $this->billingQuery()
            ->select([
                DB::raw("DATE_FORMAT(billings.created_at, '{$dateFormat}') as label"),
                DB::raw('COUNT(*) as orders'),
                DB::raw('SUM(billings.total_amount) as revenue'),
            ])
            ->groupBy('label')
            ->orderBy('label')
            ->get()
            ->map(fn ($row) => [
                'label' => (string) $row->label,
                'orders' => (int) $row->orders,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{category: string, label: string, revenue: float, units: int}>
     */
    public function categoryRevenue(): array
    {
        return $this->healthRecordQuery()
            ->select([
                'health_records.type as category',
                DB::raw('SUM(health_records.quantity) as units'),
                DB::raw('SUM(health_records.line_total) as revenue'),
            ])
            ->groupBy('health_records.type')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($row) => [
                'category' => (string) $row->category,
                'label' => ClinicServices::label((string) $row->category),
                'revenue' => round((float) $row->revenue, 2),
                'units' => (int) $row->units,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{method: string, label: string, amount: float, count: int}>
     */
    public function paymentMethods(): array
    {
        $labels = [
            'cash' => 'Cash',
            'card' => 'Card',
            'gcash' => 'GCash',
            'maya' => 'Maya',
            'bank_transfer' => 'Bank Transfer',
        ];

        return Payment::query()
            ->join('billings', 'payments.billing_id', '=', 'billings.id')
            ->where(fn (Builder $query) => $query
                ->where('billings.sale_type', 'clinic_service')
                ->orWhereNull('billings.sale_type'))
            ->where('billings.status', 'paid')
            ->when($this->clinicId, fn ($query) => $query->where('billings.clinic_id', $this->clinicId))
            ->when($this->dateFrom && $this->dateTo, function ($query) {
                $query->whereDate('billings.created_at', '>=', $this->dateFrom)
                    ->whereDate('billings.created_at', '<=', $this->dateTo);
            })
            ->select([
                'payments.method',
                DB::raw('COUNT(*) as payment_count'),
                DB::raw('SUM(payments.amount) as total_amount'),
            ])
            ->groupBy('payments.method')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($row) => [
                'method' => (string) $row->method,
                'label' => $labels[$row->method] ?? ucfirst((string) $row->method),
                'amount' => round((float) $row->total_amount, 2),
                'count' => (int) $row->payment_count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{client_id: int, name: string, orders: int, revenue: float}>
     */
    public function topCustomers(int $limit = 10): array
    {
        return $this->billingQuery()
            ->join('clients', 'billings.client_id', '=', 'clients.id')
            ->select([
                'clients.id as client_id',
                'clients.name',
                DB::raw('COUNT(billings.id) as orders'),
                DB::raw('SUM(billings.total_amount) as revenue'),
            ])
            ->whereNotNull('billings.client_id')
            ->groupBy('clients.id', 'clients.name')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'client_id' => (int) $row->client_id,
                'name' => (string) $row->name,
                'orders' => (int) $row->orders,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{id: int, name: string, category: string}>
     */
    public function zeroSalesServices(int $limit = 10): array
    {
        $soldCatalogIds = $this->healthRecordQuery()
            ->whereNotNull('health_records.service_catalog_id')
            ->select('health_records.service_catalog_id')
            ->groupBy('health_records.service_catalog_id')
            ->pluck('health_records.service_catalog_id');

        return ServiceCatalog::query()
            ->when($this->clinicId, fn ($query) => $query->forClinic($this->clinicId))
            ->when($soldCatalogIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $soldCatalogIds))
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'category'])
            ->map(fn (ServiceCatalog $service) => [
                'id' => $service->id,
                'name' => $service->name,
                'category' => ClinicServices::label((string) $service->category),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{id: int, invoice_number: string, client_name: string, balance: float, status: string}>
     */
    public function outstandingInvoices(int $limit = 10): array
    {
        return Billing::query()
            ->with('client:id,name')
            ->where(fn (Builder $query) => $query
                ->where('billings.sale_type', 'clinic_service')
                ->orWhereNull('billings.sale_type'))
            ->whereIn('billings.status', ['unpaid', 'partial'])
            ->when($this->clinicId, fn ($query) => $query->where('billings.clinic_id', $this->clinicId))
            ->orderBy('billings.due_date')
            ->orderByDesc('billings.created_at')
            ->limit($limit)
            ->get(['id', 'invoice_number', 'client_id', 'total_amount', 'amount_paid', 'status'])
            ->map(fn (Billing $billing) => [
                'id' => $billing->id,
                'invoice_number' => $billing->invoice_number,
                'client_name' => (string) ($billing->client?->name ?? '—'),
                'balance' => round((float) $billing->total_amount - (float) $billing->amount_paid, 2),
                'status' => $billing->status,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, array{fast_moving: Collection, slow_moving: Collection}>
     */
    private function serviceMovementByPeriod(): array
    {
        $dateFormat = $this->dateFormat();

        $rows = $this->healthRecordQuery()
            ->leftJoin('service_catalogs', 'health_records.service_catalog_id', '=', 'service_catalogs.id')
            ->select([
                DB::raw('COALESCE(service_catalogs.name, health_records.title) as name'),
                'health_records.type as category',
                DB::raw("DATE_FORMAT(billings.created_at, '{$dateFormat}') as period_label"),
                DB::raw('SUM(health_records.quantity) as total_qty'),
                DB::raw('SUM(health_records.line_total) as total_revenue'),
            ])
            ->groupBy(
                DB::raw('COALESCE(service_catalogs.name, health_records.title)'),
                'health_records.type',
                'period_label',
            )
            ->orderByDesc('total_qty')
            ->get();

        return $rows->groupBy('period_label')
            ->map(fn (Collection $items) => $this->formatMovementBuckets($items))
            ->sortKeysDesc()
            ->all();
    }

    /**
     * @return array<string, array{fast_moving: list<mixed>, slow_moving: list<mixed>}>
     */
    private function serviceMovementForRange(): array
    {
        $label = Carbon::parse($this->dateFrom)->format('M j, Y')
            .' – '
            .Carbon::parse($this->dateTo)->format('M j, Y');

        $rows = $this->healthRecordQuery()
            ->leftJoin('service_catalogs', 'health_records.service_catalog_id', '=', 'service_catalogs.id')
            ->select([
                DB::raw('COALESCE(service_catalogs.name, health_records.title) as name'),
                'health_records.type as category',
                DB::raw('SUM(health_records.quantity) as total_qty'),
                DB::raw('SUM(health_records.line_total) as total_revenue'),
            ])
            ->groupBy(
                DB::raw('COALESCE(service_catalogs.name, health_records.title)'),
                'health_records.type',
            )
            ->orderByDesc('total_qty')
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        return [
            $label => $this->formatMovementBuckets($rows),
        ];
    }

    /**
     * @return array{fast_moving: Collection<int, mixed>, slow_moving: Collection<int, mixed>}
     */
    private function formatMovementBuckets(Collection $items): array
    {
        $aggregated = $items->map(fn ($row) => [
            'name' => (string) $row->name,
            'category' => ClinicServices::label((string) $row->category),
            'total_qty' => (int) $row->total_qty,
            'total_revenue' => round((float) $row->total_revenue, 2),
        ]);

        return [
            'fast_moving' => $aggregated->sortByDesc('total_qty')->take(10)->values(),
            'slow_moving' => $aggregated->sortBy('total_qty')->take(10)->values(),
        ];
    }

    private function billingQuery(): Builder
    {
        return Billing::query()
            ->where(fn (Builder $query) => $query
                ->where('billings.sale_type', 'clinic_service')
                ->orWhereNull('billings.sale_type'))
            ->where('billings.status', 'paid')
            ->when($this->clinicId, fn ($query) => $query->where('billings.clinic_id', $this->clinicId))
            ->when($this->dateFrom && $this->dateTo, function ($query) {
                $query->whereDate('billings.created_at', '>=', $this->dateFrom)
                    ->whereDate('billings.created_at', '<=', $this->dateTo);
            });
    }

    private function lineItemQuery(): Builder
    {
        return BillingLineItem::query()
            ->join('billings', 'billing_line_items.billing_id', '=', 'billings.id')
            ->where(fn (Builder $query) => $query
                ->where('billings.sale_type', 'clinic_service')
                ->orWhereNull('billings.sale_type'))
            ->where('billings.status', 'paid')
            ->when($this->clinicId, fn ($query) => $query->where('billings.clinic_id', $this->clinicId))
            ->when($this->dateFrom && $this->dateTo, function ($query) {
                $query->whereDate('billings.created_at', '>=', $this->dateFrom)
                    ->whereDate('billings.created_at', '<=', $this->dateTo);
            });
    }

    private function healthRecordQuery(): Builder
    {
        return HealthRecord::query()
            ->join('billings', 'health_records.billing_id', '=', 'billings.id')
            ->where(fn (Builder $query) => $query
                ->where('billings.sale_type', 'clinic_service')
                ->orWhereNull('billings.sale_type'))
            ->where('billings.status', 'paid')
            ->when($this->clinicId, fn ($query) => $query->where('billings.clinic_id', $this->clinicId))
            ->when($this->dateFrom && $this->dateTo, function ($query) {
                $query->whereDate('billings.created_at', '>=', $this->dateFrom)
                    ->whereDate('billings.created_at', '<=', $this->dateTo);
            });
    }

    private function dateFormat(): string
    {
        if ($this->dateFrom && $this->dateTo) {
            $days = Carbon::parse($this->dateFrom)->diffInDays(Carbon::parse($this->dateTo));

            return $days <= 31 ? '%Y-%m-%d' : '%Y-%m';
        }

        return match ($this->period) {
            'daily' => '%Y-%m-%d',
            'weekly' => '%Y-%u',
            'yearly' => '%Y',
            default => '%Y-%m',
        };
    }
}
