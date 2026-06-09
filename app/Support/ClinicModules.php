<?php

namespace App\Support;

class ClinicModules
{
    /**
     * Map a route name to the clinic module key required to access it.
     * Returns null when the route is not module-gated.
     */
    public static function moduleForRoute(?string $routeName): ?string
    {
        if (! $routeName) {
            return null;
        }

        return match (true) {
            $routeName === 'dashboard' => 'dashboard',
            str_starts_with($routeName, 'pets.') => 'pets',
            str_starts_with($routeName, 'health-records.') => 'pets',
            str_starts_with($routeName, 'appointments.') => 'scheduling',
            str_starts_with($routeName, 'vaccinations.') => 'vaccinations',
            str_starts_with($routeName, 'grooming.') => 'grooming',
            str_starts_with($routeName, 'billing.') => 'billing',
            str_starts_with($routeName, 'pet-shop-billing.') => 'pet_shop_billing',
            $routeName === 'pet-shop-reports.index' => 'pet_shop',
            str_starts_with($routeName, 'pet-shop.') => 'pet_shop',
            str_starts_with($routeName, 'medicines.') => 'inventory',
            str_starts_with($routeName, 'service-catalog.') => 'service_catalog',
            $routeName === 'notifications.index' => 'notifications',
            str_starts_with($routeName, 'reports.') => 'reports',
            str_starts_with($routeName, 'clients.') => 'dashboard',
            default => null,
        };
    }

    public static function clinicHasModule(?array $enabledModules, ?string $module): bool
    {
        if (! $module) {
            return true;
        }

        return in_array($module, $enabledModules ?? [], true);
    }
}
