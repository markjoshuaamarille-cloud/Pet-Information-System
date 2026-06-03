<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PetResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_id' => $this->client_id,
            'client' => new ClientResource($this->whenLoaded('client')),
            'pet_name' => $this->pet_name,
            'species' => $this->species,
            'breed' => $this->breed,
            'age' => $this->age,
            'gender' => $this->gender,
            'birth_date' => $this->birth_date?->toDateString(),
            'weight' => $this->weight,
            'color' => $this->color,
            'microchip_no' => $this->microchip_no,
            'vaccination_status' => $this->vaccination_status,
            'medical_history' => $this->medical_history,
            'photo_url' => $this->photo_url,
            'health_records' => HealthRecordResource::collection($this->whenLoaded('healthRecords')),
            'appointments' => AppointmentResource::collection($this->whenLoaded('appointments')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
