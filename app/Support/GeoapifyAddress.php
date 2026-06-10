<?php

namespace App\Support;

class GeoapifyAddress
{
    /**
     * @return array<string, mixed>
     */
    public static function fromGeocodeProperties(array $properties): array
    {
        $line1 = trim(trim($properties['housenumber'] ?? '').' '.($properties['street'] ?? ''));

        if ($line1 === '') {
            $line1 = trim($properties['address_line1'] ?? '');
        }

        $barangay = $properties['suburb']
            ?? $properties['district']
            ?? $properties['neighbourhood']
            ?? $properties['locality']
            ?? '';

        $city = $properties['city']
            ?? $properties['town']
            ?? $properties['municipality']
            ?? $properties['county']
            ?? '';

        return [
            'address_line1'     => $line1,
            'address_line2'     => trim($properties['address_line2'] ?? ''),
            'barangay'          => trim((string) $barangay),
            'city'              => trim((string) $city),
            'province'          => trim($properties['state'] ?? ''),
            'postal_code'       => trim($properties['postcode'] ?? ''),
            'country'           => trim($properties['country'] ?? '') ?: 'Philippines',
            'address_formatted' => trim($properties['formatted'] ?? ''),
            'geoapify_place_id' => $properties['place_id'] ?? null,
            'geoapify_label'    => $properties['formatted'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    public static function composeAddress(array $fields): string
    {
        $parts = array_filter([
            trim($fields['address_line1'] ?? ''),
            trim($fields['address_line2'] ?? ''),
            self::withPrefix($fields['barangay'] ?? '', 'Brgy.'),
            trim($fields['city'] ?? ''),
            trim($fields['province'] ?? ''),
            trim($fields['postal_code'] ?? ''),
            trim($fields['country'] ?? ''),
        ], fn (string $part) => $part !== '');

        return implode(', ', $parts);
    }

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    public static function normalizeFields(array $fields): array
    {
        $normalized = [
            'address_line1'     => trim($fields['address_line1'] ?? ''),
            'address_line2'     => trim($fields['address_line2'] ?? ''),
            'barangay'          => trim($fields['barangay'] ?? ''),
            'city'              => trim($fields['city'] ?? ''),
            'province'          => trim($fields['province'] ?? ''),
            'postal_code'       => trim($fields['postal_code'] ?? ''),
            'country'           => trim($fields['country'] ?? '') ?: 'Philippines',
            'address_formatted' => trim($fields['address_formatted'] ?? ''),
            'latitude'          => $fields['latitude'] ?? null,
            'longitude'         => $fields['longitude'] ?? null,
            'geoapify_place_id' => $fields['geoapify_place_id'] ?? null,
            'geoapify_label'    => $fields['geoapify_label'] ?? null,
        ];

        $composed = self::composeAddress($normalized);

        $normalized['address'] = $composed !== ''
            ? $composed
            : ($normalized['address_formatted'] ?: null);

        if ($normalized['address_formatted'] === '' && $normalized['address']) {
            $normalized['address_formatted'] = $normalized['address'];
        }

        return $normalized;
    }

    /**
     * Same as normalizeFields but omits Geoapify metadata not stored on clients.
     *
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    public static function normalizeClientFields(array $fields): array
    {
        $normalized = self::normalizeFields($fields);
        unset($normalized['geoapify_place_id'], $normalized['geoapify_label']);

        return $normalized;
    }

    /**
     * @return array<string, string>
     */
    public static function validationRules(bool $requireCoordinates = false): array
    {
        $rules = [
            'address_line1'     => ['required', 'string', 'max:255'],
            'address_line2'     => ['nullable', 'string', 'max:255'],
            'barangay'          => ['required', 'string', 'max:255'],
            'city'              => ['required', 'string', 'max:255'],
            'province'          => ['required', 'string', 'max:255'],
            'postal_code'       => ['nullable', 'string', 'max:20'],
            'country'           => ['nullable', 'string', 'max:100'],
            'address'           => ['nullable', 'string', 'max:500'],
            'address_formatted' => ['nullable', 'string', 'max:500'],
            'geoapify_place_id' => ['nullable', 'string', 'max:255'],
            'geoapify_label'    => ['nullable', 'string', 'max:500'],
        ];

        if ($requireCoordinates) {
            $rules['latitude'] = ['required', 'numeric', 'between:-90,90'];
            $rules['longitude'] = ['required', 'numeric', 'between:-180,180'];
        } else {
            $rules['latitude'] = ['nullable', 'numeric', 'between:-90,90'];
            $rules['longitude'] = ['nullable', 'numeric', 'between:-180,180'];
        }

        return $rules;
    }

    private static function withPrefix(string $value, string $prefix): string
    {
        $value = trim($value);

        if ($value === '') {
            return '';
        }

        if (stripos($value, $prefix) === 0) {
            return $value;
        }

        return "{$prefix} {$value}";
    }
}
