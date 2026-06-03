<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\AppointmentResource;
use App\Http\Resources\ClientResource;
use App\Http\Resources\HealthRecordResource;
use App\Http\Resources\PetResource;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Pet;
use App\Services\HealthRecordService;
use App\Support\ClinicServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Health Records
 */
class HealthRecordController extends Controller
{
    public function __construct(private HealthRecordService $healthRecords) {}

    public function store(Request $request, Pet $pet): JsonResponse
    {
        $record = $this->healthRecords->store($request, $pet);

        return $this->created([
            'health_record' => new HealthRecordResource($record->load('medicine')),
        ], 'Health record added successfully.');
    }

    public function update(Request $request, Pet $pet, int $healthRecord): JsonResponse
    {
        $record = $pet->healthRecords()->findOrFail($healthRecord);
        $updated = $this->healthRecords->update($request, $pet, $record);

        return $this->success([
            'health_record' => new HealthRecordResource($updated),
        ], 'Health record updated successfully.');
    }

    public function destroy(Pet $pet, int $healthRecord): JsonResponse
    {
        $record = $pet->healthRecords()->findOrFail($healthRecord);
        $this->healthRecords->destroy($pet, $record);

        return $this->deleted('Health record removed.');
    }

    public function destroySticker(Pet $pet, int $healthRecord): JsonResponse
    {
        $record = $pet->healthRecords()->findOrFail($healthRecord);
        $updated = $this->healthRecords->destroySticker($pet, $record);

        return $this->success([
            'health_record' => new HealthRecordResource($updated),
        ], 'Vaccine sticker removed.');
    }
}
