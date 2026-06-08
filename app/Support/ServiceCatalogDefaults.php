<?php

namespace App\Support;

use App\Models\ServiceCatalog;

class ServiceCatalogDefaults
{
    /**
     * Seed the standard service catalog entries for a clinic (price 0.00).
     * Skips codes that already exist for that clinic.
     */
    public static function seedForClinic(int $clinicId): void
    {
        foreach (ClinicServices::catalogDefaults() as $service) {
            ServiceCatalog::updateOrCreate(
                [
                    'clinic_id' => $clinicId,
                    'code'      => $service['code'],
                ],
                [
                    'name'          => $service['name'],
                    'category'      => $service['category'],
                    'default_price' => 0,
                ],
            );
        }
    }
}
