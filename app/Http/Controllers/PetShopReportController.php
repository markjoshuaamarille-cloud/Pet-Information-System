<?php

namespace App\Http\Controllers;

use App\Models\BillingLineItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PetShopReportController extends Controller
{
    public function index(Request $request): Response
    {
        $clinicId = $request->attributes->get('active_clinic_id');
        $period   = $request->get('period', 'monthly'); // daily|weekly|monthly|yearly

        $dateFormat = match ($period) {
            'daily'   => '%Y-%m-%d',
            'weekly'  => '%Y-%u',
            'yearly'  => '%Y',
            default   => '%Y-%m',
        };

        $query = BillingLineItem::query()
            ->join('billings', 'billing_line_items.billing_id', '=', 'billings.id')
            ->join('medicines', 'billing_line_items.medicine_id', '=', 'medicines.id')
            ->where('billings.sale_type', 'pet_shop_retail')
            ->where('billings.status', 'paid');

        if ($clinicId) {
            $query->where('billings.clinic_id', $clinicId);
        }

        $rows = $query
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

        // Pivot: group by period → products sorted by qty
        $byPeriod = $rows->groupBy('period_label')->map(function ($items) {
            return [
                'fast_moving' => $items->sortByDesc('total_qty')->take(10)->values(),
                'slow_moving' => $items->sortBy('total_qty')->take(10)->values(),
            ];
        })->sortKeysDesc();

        return Inertia::render('PetShopReports/Index', [
            'reportData' => $byPeriod,
            'period'     => $period,
            'periods'    => [
                ['value' => 'daily',   'label' => 'Daily'],
                ['value' => 'weekly',  'label' => 'Weekly'],
                ['value' => 'monthly', 'label' => 'Monthly'],
                ['value' => 'yearly',  'label' => 'Yearly'],
            ],
        ]);
    }
}
