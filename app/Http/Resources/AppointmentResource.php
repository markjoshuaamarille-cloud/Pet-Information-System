<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pet_id' => $this->pet_id,
            'client_id' => $this->client_id,
            'pet' => new PetResource($this->whenLoaded('pet')),
            'client' => new ClientResource($this->whenLoaded('client')),
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'type' => $this->type,
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
