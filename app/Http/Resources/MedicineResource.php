<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MedicineResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category,
            'description' => $this->description,
            'quantity' => $this->quantity,
            'unit' => $this->unit,
            'unit_price' => $this->unit_price,
            'expiry_date' => $this->expiry_date,
            'reorder_level' => $this->reorder_level,
            'image_url' => $this->image_url,
            'stock_status' => $this->when(isset($this->stock_status), $this->stock_status ?? $this->stockStatus()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
