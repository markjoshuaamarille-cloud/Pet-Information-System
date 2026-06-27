<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\PlatformCommission;
use App\Models\PlatformCommissionSettlement;
use App\Models\PlatformSetting;
use App\Support\PlatformCommissionReportBuilder;
use App\Support\PlatformCommissionService;
use App\Support\SettlementReceiptNumberGenerator;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PlatformCommissionController extends Controller
{
    public function index(Request $request): Response
    {
        $report = $this->builder($request)->build();

        return Inertia::render('Admin/PlatformCommissions/Index', [
            'commissionRate' => PlatformSetting::commissionRate(),
            'summary' => $report['summary'],
            'byClinic' => $report['by_clinic'],
            'byBusinessLine' => $report['by_business_line'],
            'unsettledByClinic' => $report['unsettled_by_clinic'],
            'transactions' => $report['transactions'],
            'unsettledTransactions' => $report['unsettled_transactions'],
            'settlements' => $report['settlements'],
            'filters' => $report['filters'],
            'clinics' => Clinic::query()->orderBy('name')->get(['id', 'name']),
            'periods' => [
                ['value' => 'daily', 'label' => 'Today'],
                ['value' => 'weekly', 'label' => 'This Week'],
                ['value' => 'monthly', 'label' => 'This Month'],
                ['value' => 'yearly', 'label' => 'This Year'],
            ],
            'businessLines' => [
                ['value' => '', 'label' => 'All services'],
                ['value' => 'veterinary', 'label' => 'Veterinary Clinic'],
                ['value' => 'pet_shop', 'label' => 'Pet Shop'],
                ['value' => 'grooming', 'label' => 'Grooming'],
            ],
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'commission_rate' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $rate = (float) $validated['commission_rate'];

        PlatformSetting::updateCommissionRate($rate);

        $recalculated = PlatformCommissionService::recalculateUnsettled($rate);

        $message = 'Commission rate updated successfully.';
        if ($recalculated > 0) {
            $message .= " Recalculated {$recalculated} unsettled transaction(s).";
        }

        return redirect()->back()->with('success', $message);
    }

    public function storeSettlement(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'clinic_id' => ['required', 'integer', 'exists:clinics,id'],
            'amount_received' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,card,gcash,maya,bank_transfer'],
            'paid_at' => ['required', 'date'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date'],
        ]);

        if (
            ! empty($validated['period_start'])
            && ! empty($validated['period_end'])
            && $validated['period_end'] < $validated['period_start']
        ) {
            throw ValidationException::withMessages([
                'period_end' => 'Period end must be on or after period start.',
            ]);
        }

        $settlement = DB::transaction(function () use ($request, $validated) {
            $commissionQuery = PlatformCommission::query()
                ->where('clinic_id', $validated['clinic_id'])
                ->whereNull('settlement_id');

            if (! empty($validated['period_start']) || ! empty($validated['period_end'])) {
                $timezone = config('app.timezone');
                $periodStart = $validated['period_start'] ?? null;
                $periodEnd = $validated['period_end'] ?? null;

                $commissionQuery->whereHas('payment', function ($paymentQuery) use ($timezone, $periodStart, $periodEnd): void {
                    if ($periodStart && $periodEnd) {
                        $paymentQuery->whereBetween('paid_at', [
                            Carbon::parse($periodStart, $timezone)->startOfDay(),
                            Carbon::parse($periodEnd, $timezone)->endOfDay(),
                        ]);

                        return;
                    }

                    if ($periodStart) {
                        $paymentQuery->where(
                            'paid_at',
                            '>=',
                            Carbon::parse($periodStart, $timezone)->startOfDay(),
                        );
                    }

                    if ($periodEnd) {
                        $paymentQuery->where(
                            'paid_at',
                            '<=',
                            Carbon::parse($periodEnd, $timezone)->endOfDay(),
                        );
                    }
                });
            }

            $commissions = $commissionQuery->lockForUpdate()->get();

            if ($commissions->isEmpty()) {
                throw ValidationException::withMessages([
                    'clinic_id' => 'No unsettled commission transactions found for this clinic and period.',
                ]);
            }

            $totalCommission = round((float) $commissions->sum('commission_amount'), 2);

            if (abs((float) $validated['amount_received'] - $totalCommission) > 0.01) {
                throw ValidationException::withMessages([
                    'amount_received' => 'Amount received must match the unsettled commission total of ₱'
                        .number_format($totalCommission, 2).'.',
                ]);
            }

            $settlement = PlatformCommissionSettlement::create([
                'clinic_id' => $validated['clinic_id'],
                'receipt_number' => SettlementReceiptNumberGenerator::generate(),
                'period_start' => $validated['period_start'] ?? $commissions->min('transaction_at')?->toDateString(),
                'period_end' => $validated['period_end'] ?? $commissions->max('transaction_at')?->toDateString(),
                'transaction_count' => $commissions->count(),
                'total_gross' => round((float) $commissions->sum('transaction_amount'), 2),
                'total_commission' => $totalCommission,
                'total_business_earnings' => round((float) $commissions->sum('business_earnings'), 2),
                'amount_received' => (float) $validated['amount_received'],
                'payment_method' => $validated['payment_method'],
                'reference_number' => $validated['reference_number'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'paid_at' => $validated['paid_at'],
                'recorded_by' => $request->user()?->id,
            ]);

            PlatformCommission::query()
                ->whereIn('id', $commissions->pluck('id'))
                ->update(['settlement_id' => $settlement->id]);

            return $settlement;
        });

        return redirect()
            ->route('admin.platform-commissions.settlement-receipt', $settlement)
            ->with('success', 'Commission payment recorded. Receipt generated.');
    }

    public function settlementReceipt(PlatformCommissionSettlement $settlement): Response
    {
        $settlement->load([
            'clinic:id,name,contact,email,address,address_formatted,city,province',
            'recordedBy:id,name',
            'commissions' => fn ($query) => $query->orderBy('transaction_at'),
        ]);

        return Inertia::render('Admin/PlatformCommissions/SettlementReceipt', [
            'settlement' => [
                'id' => $settlement->id,
                'receipt_number' => $settlement->receipt_number,
                'clinic' => $settlement->clinic,
                'period_start' => $settlement->period_start?->toDateString(),
                'period_end' => $settlement->period_end?->toDateString(),
                'transaction_count' => $settlement->transaction_count,
                'total_gross' => (float) $settlement->total_gross,
                'total_commission' => (float) $settlement->total_commission,
                'total_business_earnings' => (float) $settlement->total_business_earnings,
                'amount_received' => (float) $settlement->amount_received,
                'payment_method' => $settlement->payment_method,
                'reference_number' => $settlement->reference_number,
                'notes' => $settlement->notes,
                'paid_at' => $settlement->paid_at?->toIso8601String(),
                'recorded_by' => $settlement->recordedBy?->name,
                'commissions' => $settlement->commissions->map(fn (PlatformCommission $c) => [
                    'invoice_number' => $c->invoice_number,
                    'business_line_label' => $c->businessLineLabel(),
                    'transaction_amount' => (float) $c->transaction_amount,
                    'commission_rate' => (float) $c->commission_rate,
                    'commission_amount' => (float) $c->commission_amount,
                    'business_earnings' => (float) $c->business_earnings,
                    'transaction_at' => $c->transaction_at?->toIso8601String(),
                ]),
            ],
        ]);
    }

    private function builder(Request $request): PlatformCommissionReportBuilder
    {
        $dateFrom = $request->filled('date_from') ? $request->input('date_from') : null;
        $dateTo = $request->filled('date_to') ? $request->input('date_to') : null;
        $usePeriod = ! $dateFrom && ! $dateTo;

        return new PlatformCommissionReportBuilder(
            period: $usePeriod ? $request->input('period', 'monthly') : '',
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            clinicId: $request->filled('clinic_id') ? (int) $request->input('clinic_id') : null,
            businessLine: $request->filled('business_line') ? $request->input('business_line') : null,
        );
    }
}
