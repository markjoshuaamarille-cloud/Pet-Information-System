<?php

namespace App\Support;

use App\Models\Billing;
use App\Models\BillingLineItem;
use App\Models\Medicine;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PetShopReportBuilder
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
            'zero_sales' => $this->zeroSalesProducts(),
            'reorder_alerts' => $this->reorderAlerts(),
            'report_data' => $useCustomRange
                ? $this->productMovementForRange()
                : $this->productMovementByPeriod(),
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
        return $this->lineItemQuery()
            ->select([
                'medicines.category',
                DB::raw('SUM(billing_line_items.quantity) as units'),
                DB::raw('SUM(billing_line_items.line_total) as revenue'),
            ])
            ->groupBy('medicines.category')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($row) => [
                'category' => (string) $row->category,
                'label' => PetShopCategories::label((string) $row->category),
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
            ->where('billings.sale_type', 'pet_shop_retail')
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
     * @return list<array{id: int, name: string, category: string, quantity: int}>
     */
    public function zeroSalesProducts(int $limit = 10): array
    {
        $soldIds = $this->lineItemQuery()
            ->select('medicines.id')
            ->groupBy('medicines.id')
            ->pluck('medicines.id');

        return Medicine::query()
            ->when($this->clinicId, fn ($query) => $query->forClinic($this->clinicId))
            ->whereIn('category', PetShopCategories::shopCategories())
            ->where('is_active', true)
            ->when($soldIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $soldIds))
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'category', 'quantity'])
            ->map(fn (Medicine $medicine) => [
                'id' => $medicine->id,
                'name' => $medicine->name,
                'category' => PetShopCategories::label((string) $medicine->category),
                'quantity' => (int) $medicine->quantity,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{id: int, name: string, quantity: int, reorder_level: int, sold_qty: int}>
     */
    public function reorderAlerts(int $limit = 10): array
    {
        $sold = $this->lineItemQuery()
            ->select([
                'medicines.id',
                'medicines.name',
                'medicines.quantity',
                'medicines.reorder_level',
                DB::raw('SUM(billing_line_items.quantity) as sold_qty'),
            ])
            ->groupBy('medicines.id', 'medicines.name', 'medicines.quantity', 'medicines.reorder_level')
            ->havingRaw('SUM(billing_line_items.quantity) > 0')
            ->orderByDesc('sold_qty')
            ->get();

        return $sold
            ->filter(fn ($row) => (int) $row->quantity <= (int) $row->reorder_level)
            ->take($limit)
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => (string) $row->name,
                'quantity' => (int) $row->quantity,
                'reorder_level' => (int) $row->reorder_level,
                'sold_qty' => (int) $row->sold_qty,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, array{fast_moving: Collection, slow_moving: Collection}>
     */
    private function productMovementByPeriod(): array
    {
        $dateFormat = $this->dateFormat();

        $rows = $this->lineItemQuery()
            ->select([
                'medicines.id',
                'medicines.name',
                'medicines.category',
                DB::raw("DATE_FORMAT(billings.created_at, '{$dateFormat}') as period_label"),
                DB::raw('SUM(billing_line_items.quantity) as total_qty'),
                DB::raw('SUM(billing_line_items.line_total) as total_revenue'),
            ])
            ->groupBy('medicines.id', 'medicines.name', 'medicines.category', 'period_label')
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
    private function productMovementForRange(): array
    {
        $label = Carbon::parse($this->dateFrom)->format('M j, Y')
            .' – '
            .Carbon::parse($this->dateTo)->format('M j, Y');

        $rows = $this->lineItemQuery()
            ->select([
                'medicines.id',
                'medicines.name',
                'medicines.category',
                DB::raw('SUM(billing_line_items.quantity) as total_qty'),
                DB::raw('SUM(billing_line_items.line_total) as total_revenue'),
            ])
            ->groupBy('medicines.id', 'medicines.name', 'medicines.category')
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
            'id' => (int) $row->id,
            'name' => (string) $row->name,
            'category' => (string) $row->category,
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
            ->where('billings.sale_type', 'pet_shop_retail')
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
            ->join('medicines', 'billing_line_items.medicine_id', '=', 'medicines.id')
            ->where('billings.sale_type', 'pet_shop_retail')
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
