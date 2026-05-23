<?php

namespace App\Http\Controllers;

use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Reports/Index', [
            'summary' => [
                'total_pets' => Pet::count(),
                'total_health_records' => HealthRecord::count(),
                'consultations' => HealthRecord::where('type', 'consultation')->count(),
                'vaccinations' => HealthRecord::where('type', 'vaccination')->count(),
                'grooming' => HealthRecord::where('type', 'grooming')->count(),
                'medications' => HealthRecord::where('type', 'medication')->count(),
                'inventory_items' => Medicine::count(),
                'expired_items' => Medicine::expired()->count(),
                'critical_items' => Medicine::criticalStock()->count(),
            ],
        ]);
    }

    public function pets(): Response
    {
        return Inertia::render('Reports/Pets', [
            'pets' => Pet::with(['client', 'healthRecords'])->orderBy('pet_name')->get(),
        ]);
    }

    public function inventory(): Response
    {
        return Inertia::render('Reports/Inventory', [
            'medicines' => Medicine::orderBy('name')->get()->map(fn (Medicine $m) => [
                ...$m->toArray(),
                'stock_status' => $m->stockStatus(),
            ]),
        ]);
    }

    public function exportPets(): StreamedResponse
    {
        $pets = Pet::with(['client', 'healthRecords'])
            ->orderBy('pet_name')
            ->get();

        return response()->streamDownload(function () use ($pets) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Pet Name', 'Species', 'Breed', 'Age', 'Owner', 'Health Records']);

            foreach ($pets as $pet) {
                fputcsv($handle, [
                    $pet->pet_name,
                    $pet->species,
                    $pet->breed,
                    $pet->age,
                    $pet->client?->name ?? 'N/A',
                    $pet->healthRecords->count(),
                ]);
            }

            fclose($handle);
        }, 'pets-report.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function exportInventory(): StreamedResponse
    {
        $medicines = Medicine::orderBy('name')->get();

        return response()->streamDownload(function () use ($medicines) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Name', 'Category', 'Quantity', 'Unit', 'Expiry Date', 'Reorder Level', 'Status']);

            foreach ($medicines as $medicine) {
                /** @var Medicine $medicine */
                fputcsv($handle, [
                    $medicine->name,
                    $medicine->category,
                    $medicine->quantity,
                    $medicine->unit,
                    $medicine->expiry_date ? Carbon::parse((string) $medicine->expiry_date)->format('Y-m-d') : null,
                    $medicine->reorder_level,
                    $medicine->stockStatus(),
                ]);
            }

            fclose($handle);
        }, 'inventory-report.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
