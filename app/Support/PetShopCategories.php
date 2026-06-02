<?php

namespace App\Support;

class PetShopCategories
{
    private const ALL = [
        'medicine' => 'Medicine',
        'vaccine' => 'Vaccine',
        'supplement_vitamin' => 'Supplement / Vitamin',
        'consumable_supply' => 'Consumable / Supply',
        'parasite_control' => 'Parasite Control',
        'grooming_hygiene' => 'Grooming / Hygiene',
        'pet_food' => 'Pet Food',
    ];

    /**
     * @return list<string>
     */
    public static function shopCategories(): array
    {
        return array_values(array_filter(
            array_keys(self::ALL),
            fn (string $key) => $key !== 'vaccine',
        ));
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return array_filter(
            self::ALL,
            fn (string $key) => $key !== 'vaccine',
            ARRAY_FILTER_USE_KEY,
        );
    }

    public static function label(string $category): string
    {
        return self::ALL[$category] ?? ucfirst(str_replace('_', ' ', $category));
    }

    public static function isShopCategory(string $category): bool
    {
        return in_array($category, self::shopCategories(), true);
    }
}
