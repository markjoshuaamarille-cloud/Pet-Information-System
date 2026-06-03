<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\ReportController as WebReportController;
use App\Http\Resources\PetResource;
use App\Models\GroomingRecord;
use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use App\Models\Vaccination;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * @group Reports
 */
class ReportController extends Controller
{
    public function index(): JsonResponse
    {
        $healthRecordCounts = HealthRecord::query()
            ->selectRaw('type, COUNT(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $vaccinationModuleCount = Vaccination::count();
        $groomingModuleCount = GroomingRecord::count();

        return $this->success([
            'summary' => [
                'total_pets' => Pet::count(),
                'total_health_records' => HealthRecord::count() + $vaccinationModuleCount + $groomingModuleCount,
                'consultations' => (int) ($healthRecordCounts['consultation'] ?? 0),
                'vaccinations' => (int) ($healthRecordCounts['vaccination'] ?? 0) + $vaccinationModuleCount,
                'grooming' => (int) ($healthRecordCounts['grooming'] ?? 0) + $groomingModuleCount,
                'medications' => (int) ($healthRecordCounts['medication'] ?? 0),
                'surgeries' => (int) ($healthRecordCounts['surgery'] ?? 0),
                'boarding_stays' => (int) ($healthRecordCounts['boarding'] ?? 0),
                'emergency_care' => (int) ($healthRecordCounts['emergency_care'] ?? 0),
                'inventory_items' => Medicine::count(),
                'expired_items' => Medicine::expired()->count(),
                'critical_items' => Medicine::criticalStock()->count(),
            ],
        ]);
    }

    public function pets(): JsonResponse
    {
        return $this->success([
            'pets' => PetResource::collection(
                Pet::with(['client', 'healthRecords'])->orderBy('pet_name')->get()
            ),
        ]);
    }

    public function inventory(): JsonResponse
    {
        return $this->success([
            'medicines' => Medicine::orderBy('name')->get()->map(fn (Medicine $m) => [
                ...$m->toArray(),
                'stock_status' => $m->stockStatus(),
            ]),
        ]);
    }

    public function exportPets(): StreamedResponse
    {
        return app(WebReportController::class)->exportPets();
    }

    public function exportInventory(): StreamedResponse
    {
        return app(WebReportController::class)->exportInventory();
    }
}
