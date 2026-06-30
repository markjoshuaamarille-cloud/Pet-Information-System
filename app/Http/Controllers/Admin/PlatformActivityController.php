<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Support\ClinicServices;
use App\Support\PlatformActivityReportBuilder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlatformActivityController extends Controller
{
    public function index(Request $request): Response
    {
        $report = $this->builder($request)->build();

        return Inertia::render('Admin/PlatformActivity/Index', [
            'summary' => $report['summary'],
            'appointments' => $report['appointments'],
            'transactions' => $report['transactions'],
            'filters' => $report['filters'],
            'clinics' => Clinic::query()->orderBy('name')->get(['id', 'name']),
            'periods' => [
                ['value' => 'daily', 'label' => 'Today'],
                ['value' => 'weekly', 'label' => 'This Week'],
                ['value' => 'monthly', 'label' => 'This Month'],
                ['value' => 'yearly', 'label' => 'This Year'],
                ['value' => 'all', 'label' => 'All Time'],
            ],
            'businessLines' => [
                ['value' => '', 'label' => 'All services'],
                ['value' => 'veterinary', 'label' => 'Veterinary Clinic'],
                ['value' => 'pet_shop', 'label' => 'Pet Shop'],
                ['value' => 'grooming', 'label' => 'Grooming'],
            ],
            'appointmentStatuses' => [
                ['value' => '', 'label' => 'All statuses'],
                ['value' => 'scheduled', 'label' => 'Scheduled'],
                ['value' => 'completed', 'label' => 'Completed'],
                ['value' => 'cancelled', 'label' => 'Cancelled'],
            ],
            'cancellationTypes' => [
                ['value' => '', 'label' => 'All cancellations'],
                ['value' => 'self_cancelled', 'label' => 'Self-cancelled (customer)'],
                ['value' => 'no_show', 'label' => 'No-show (system)'],
                ['value' => 'staff_cancelled', 'label' => 'Cancelled by staff'],
                ['value' => 'manual', 'label' => 'Other / legacy'],
            ],
            'billingStatuses' => [
                ['value' => '', 'label' => 'All statuses'],
                ['value' => 'unpaid', 'label' => 'Unpaid'],
                ['value' => 'partial', 'label' => 'Partial'],
                ['value' => 'paid', 'label' => 'Paid'],
                ['value' => 'cancelled', 'label' => 'Cancelled'],
            ],
            'saleTypes' => [
                ['value' => '', 'label' => 'All sale types'],
                ['value' => 'clinic_service', 'label' => 'Clinic Service'],
                ['value' => 'pet_shop_retail', 'label' => 'Pet Shop Retail'],
            ],
            'appointmentTypes' => collect(ClinicServices::APPOINTMENT_TYPES)
                ->map(fn (string $type) => [
                    'value' => $type,
                    'label' => ucwords(str_replace('_', ' ', $type)),
                ])
                ->prepend(['value' => '', 'label' => 'All types'])
                ->values()
                ->all(),
        ]);
    }

    private function builder(Request $request): PlatformActivityReportBuilder
    {
        $dateFrom = $request->filled('date_from') ? $request->input('date_from') : null;
        $dateTo = $request->filled('date_to') ? $request->input('date_to') : null;
        $usePeriod = ! $dateFrom && ! $dateTo;

        return new PlatformActivityReportBuilder(
            view: $request->input('view', 'appointments'),
            period: $usePeriod ? $request->input('period', 'weekly') : '',
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            clinicId: $request->filled('clinic_id') ? (int) $request->input('clinic_id') : null,
            businessLine: $request->filled('business_line') ? $request->input('business_line') : null,
            appointmentStatus: $request->filled('appointment_status') ? $request->input('appointment_status') : null,
            cancellationType: $request->filled('cancellation_type') ? $request->input('cancellation_type') : null,
            billingStatus: $request->filled('billing_status') ? $request->input('billing_status') : null,
            saleType: $request->filled('sale_type') ? $request->input('sale_type') : null,
            appointmentType: $request->filled('appointment_type') ? $request->input('appointment_type') : null,
            search: $request->filled('search') ? trim((string) $request->input('search')) : null,
            perPage: min(max((int) $request->input('per_page', 50), 10), 100),
        );
    }
}
