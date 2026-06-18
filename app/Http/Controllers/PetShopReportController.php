<?php

namespace App\Http\Controllers;

use App\Support\PetShopReportBuilder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PetShopReportController extends Controller
{
    public function index(Request $request): Response
    {
        $report = $this->builder($request)->build();

        return Inertia::render('PetShopReports/Index', [
            'summary' => $report['summary'],
            'salesTrend' => $report['sales_trend'],
            'categoryRevenue' => $report['category_revenue'],
            'paymentMethods' => $report['payment_methods'],
            'topCustomers' => $report['top_customers'],
            'zeroSales' => $report['zero_sales'],
            'reorderAlerts' => $report['reorder_alerts'],
            'reportData' => $report['report_data'],
            'filters' => $report['filters'],
            'periods' => [
                ['value' => 'daily', 'label' => 'Daily'],
                ['value' => 'weekly', 'label' => 'Weekly'],
                ['value' => 'monthly', 'label' => 'Monthly'],
                ['value' => 'yearly', 'label' => 'Yearly'],
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $report = $this->builder($request)->build();
        $filename = 'pet-shop-report-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($report) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Pet Shop Report Summary']);
            fputcsv($handle, ['Total Revenue', $report['summary']['total_revenue']]);
            fputcsv($handle, ['Total Orders', $report['summary']['total_orders']]);
            fputcsv($handle, ['Units Sold', $report['summary']['units_sold']]);
            fputcsv($handle, ['Average Order Value', $report['summary']['avg_order_value']]);
            fputcsv($handle, []);

            fputcsv($handle, ['Revenue by Category']);
            fputcsv($handle, ['Category', 'Units', 'Revenue']);
            foreach ($report['category_revenue'] as $row) {
                fputcsv($handle, [$row['label'], $row['units'], $row['revenue']]);
            }
            fputcsv($handle, []);

            fputcsv($handle, ['Payment Methods']);
            fputcsv($handle, ['Method', 'Payments', 'Amount']);
            foreach ($report['payment_methods'] as $row) {
                fputcsv($handle, [$row['label'], $row['count'], $row['amount']]);
            }
            fputcsv($handle, []);

            fputcsv($handle, ['Top Customers']);
            fputcsv($handle, ['Customer', 'Orders', 'Revenue']);
            foreach ($report['top_customers'] as $row) {
                fputcsv($handle, [$row['name'], $row['orders'], $row['revenue']]);
            }
            fputcsv($handle, []);

            foreach ($report['report_data'] as $label => $data) {
                fputcsv($handle, ["Fast Moving - {$label}"]);
                fputcsv($handle, ['Product', 'Category', 'Qty Sold', 'Revenue']);
                foreach ($data['fast_moving'] as $product) {
                    fputcsv($handle, [
                        $product['name'],
                        $product['category'],
                        $product['total_qty'],
                        $product['total_revenue'],
                    ]);
                }
                fputcsv($handle, []);

                fputcsv($handle, ["Slow Moving - {$label}"]);
                fputcsv($handle, ['Product', 'Category', 'Qty Sold', 'Revenue']);
                foreach ($data['slow_moving'] as $product) {
                    fputcsv($handle, [
                        $product['name'],
                        $product['category'],
                        $product['total_qty'],
                        $product['total_revenue'],
                    ]);
                }
                fputcsv($handle, []);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function builder(Request $request): PetShopReportBuilder
    {
        $validated = $request->validate([
            'period' => 'nullable|in:daily,weekly,monthly,yearly',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        return new PetShopReportBuilder(
            clinicId: $request->attributes->get('active_clinic_id'),
            period: $validated['period'] ?? 'monthly',
            dateFrom: $validated['date_from'] ?? null,
            dateTo: $validated['date_to'] ?? null,
        );
    }
}
