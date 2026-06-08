<?php

namespace App\Http\Controllers;

use App\Models\GroomingRecord;
use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\Vaccination;
use App\Support\ClinicPatientScope;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        $healthRecordCounts = HealthRecord::query()
            ->when($clinicId, fn ($query) => $query->forClinic($clinicId))
            ->selectRaw('type, COUNT(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $vaccinationModuleCount = Vaccination::query()
            ->when($clinicId, fn ($query) => $query->forClinic($clinicId))
            ->count();

        $groomingModuleCount = GroomingRecord::query()
            ->when($clinicId, fn ($query) => $query->forClinic($clinicId))
            ->count();

        $consultations = (int) ($healthRecordCounts['consultation'] ?? 0);
        $vaccinations = (int) ($healthRecordCounts['vaccination'] ?? 0) + $vaccinationModuleCount;
        $grooming = (int) ($healthRecordCounts['grooming'] ?? 0) + $groomingModuleCount;
        $medications = (int) ($healthRecordCounts['medication'] ?? 0);
        $surgeries = (int) ($healthRecordCounts['surgery'] ?? 0);
        $boarding = (int) ($healthRecordCounts['boarding'] ?? 0);
        $emergencyCare = (int) ($healthRecordCounts['emergency_care'] ?? 0);

        $healthRecordTotal = HealthRecord::query()
            ->when($clinicId, fn ($query) => $query->forClinic($clinicId))
            ->count();

        $medicineQuery = Medicine::query()->when($clinicId, fn ($query) => $query->forClinic($clinicId));

        return Inertia::render('Reports/Index', [
            'summary' => [
                'total_pets' => ClinicPatientScope::petsQuery($clinicId)->count(),
                'total_health_records' => $healthRecordTotal + $vaccinationModuleCount + $groomingModuleCount,
                'consultations' => $consultations,
                'vaccinations' => $vaccinations,
                'grooming' => $grooming,
                'medications' => $medications,
                'surgeries' => $surgeries,
                'boarding_stays' => $boarding,
                'emergency_care' => $emergencyCare,
                'inventory_items' => (clone $medicineQuery)->count(),
                'expired_items' => (clone $medicineQuery)->expired()->count(),
                'critical_items' => (clone $medicineQuery)->criticalStock()->count(),
            ],
        ]);
    }

    public function pets(Request $request): Response
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        return Inertia::render('Reports/Pets', [
            'pets' => ClinicPatientScope::petsQuery($clinicId)
                ->with([
                    'client',
                    'healthRecords' => fn ($query) => $query->when($clinicId, fn ($q) => $q->forClinic($clinicId)),
                ])
                ->orderBy('pet_name')
                ->get(),
        ]);
    }

    public function inventory(Request $request): Response
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        return Inertia::render('Reports/Inventory', [
            'medicines' => Medicine::query()
                ->when($clinicId, fn ($query) => $query->forClinic($clinicId))
                ->orderBy('name')
                ->get()
                ->map(fn (Medicine $m) => [
                    ...$m->toArray(),
                    'stock_status' => $m->stockStatus(),
                ]),
        ]);
    }

    public function exportPets(Request $request): StreamedResponse
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        $pets = ClinicPatientScope::petsQuery($clinicId)
            ->with([
                'client',
                'healthRecords' => fn ($query) => $query->when($clinicId, fn ($q) => $q->forClinic($clinicId)),
            ])
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

    public function exportInventory(Request $request): StreamedResponse
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        $medicines = Medicine::query()
            ->when($clinicId, fn ($query) => $query->forClinic($clinicId))
            ->orderBy('name')
            ->get();

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
