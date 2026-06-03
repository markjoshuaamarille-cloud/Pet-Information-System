<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pet_id' => $this->pet_id,
            'medicine_id' => $this->medicine_id,
            'service_catalog_id' => $this->service_catalog_id,
            'billing_id' => $this->billing_id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'dosage' => $this->dosage,
            'medication_quantity' => $this->medication_quantity,
            'unit_price' => $this->unit_price,
            'quantity' => $this->quantity,
            'line_total' => $this->line_total,
            'record_date' => $this->record_date,
            'next_due_date' => $this->next_due_date,
            'veterinarian_notes' => $this->veterinarian_notes,
            'sticker_photo_url' => $this->sticker_photo_url,
            'medicine' => new MedicineResource($this->whenLoaded('medicine')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
