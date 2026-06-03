<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BillingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'sale_type' => $this->sale_type,
            'client_id' => $this->client_id,
            'pet_id' => $this->pet_id,
            'appointment_id' => $this->appointment_id,
            'service_catalog_id' => $this->service_catalog_id,
            'service_unit_price' => $this->service_unit_price,
            'service_quantity' => $this->service_quantity,
            'subtotal' => $this->subtotal,
            'tax' => $this->tax,
            'tax_applied' => $this->tax_applied,
            'tax_rate' => $this->tax_rate,
            'discount' => $this->discount,
            'total_amount' => $this->total_amount,
            'amount_paid' => $this->amount_paid,
            'status' => $this->status,
            'inventory_deducted' => $this->inventory_deducted,
            'due_date' => $this->due_date,
            'notes' => $this->notes,
            'client' => new ClientResource($this->whenLoaded('client')),
            'pet' => new PetResource($this->whenLoaded('pet')),
            'appointment' => new AppointmentResource($this->whenLoaded('appointment')),
            'line_items' => BillingLineItemResource::collection($this->whenLoaded('lineItems')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
