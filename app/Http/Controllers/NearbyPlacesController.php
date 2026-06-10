<?php

namespace App\Http\Controllers;

use App\Support\GeoapifyAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class NearbyPlacesController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('NearbyPlaces/Index');
    }

    public function geocode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'place' => ['required', 'string', 'min:2', 'max:255'],
        ]);

        if (! config('services.geoapify.key')) {
            return response()->json([
                'message' => 'Place search is not configured. Please contact the administrator.',
            ], 503);
        }

        $feature = $this->fetchGeocodeFeature($validated['place']);

        if ($feature === null) {
            return response()->json([
                'message' => 'Unable to find that place. Please try again.',
            ], 502);
        }

        if ($feature === false) {
            return response()->json([
                'message' => 'No location found for that place name. Try a street, barangay, or city.',
            ], 404);
        }

        return response()->json($this->formatGeocodeResponse($feature, $validated['place']));
    }

    public function reverseGeocode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $apiKey = config('services.geoapify.key');

        if (! $apiKey) {
            return response()->json([
                'message' => 'Place search is not configured. Please contact the administrator.',
            ], 503);
        }

        $response = Http::timeout(15)->get('https://api.geoapify.com/v1/geocode/reverse', [
            'lat' => $validated['lat'],
            'lon' => $validated['lng'],
            'limit' => 1,
            'apiKey' => $apiKey,
            'lang' => 'en',
        ]);

        if (! $response->successful()) {
            Log::warning('Geoapify reverse geocode failed', [
                'status' => $response->status(),
                'lat' => $validated['lat'],
                'lng' => $validated['lng'],
            ]);

            return response()->json([
                'message' => 'Unable to resolve that map pin to an address. Please enter address details manually.',
            ], 502);
        }

        $feature = $response->json('features.0');

        if (! $feature) {
            return response()->json([
                'message' => 'No address found for that map location.',
            ], 404);
        }

        return response()->json($this->formatGeocodeResponse($feature));
    }

    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'type' => ['nullable', 'string', 'in:all,vet,petshop,grooming'],
            'radius' => ['nullable', 'integer', 'min:500', 'max:20000'],
        ]);

        $apiKey = config('services.geoapify.key');

        if (! $apiKey) {
            return response()->json([
                'message' => 'Nearby places search is not configured. Please contact the administrator.',
            ], 503);
        }

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];
        $radius = (int) ($validated['radius'] ?? 5000);
        $type = $validated['type'] ?? 'all';

        $categories = match ($type) {
            'vet' => 'pet.veterinary',
            'petshop' => 'pet.shop',
            'grooming' => 'pet.service',
            default => 'pet',
        };

        $response = Http::timeout(15)->get('https://api.geoapify.com/v2/places', [
            'categories' => $categories,
            'filter' => "circle:{$lng},{$lat},{$radius}",
            'limit' => 20,
            'apiKey' => $apiKey,
            'lang' => 'en',
        ]);

        if (! $response->successful()) {
            Log::warning('Geoapify places search failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'categories' => $categories,
            ]);

            $message = 'Unable to fetch nearby places. Please try again later.';

            if (config('app.debug')) {
                $apiMessage = $response->json('message');
                if (is_string($apiMessage) && $apiMessage !== '') {
                    $message = $apiMessage;
                }
            }

            return response()->json(['message' => $message], 502);
        }

        $places = collect($response->json('features') ?? [])
            ->map(function (array $feature) use ($lat, $lng) {
                $properties = $feature['properties'] ?? [];
                $coordinates = $feature['geometry']['coordinates'] ?? [null, null];
                $placeLat = $coordinates[1] ?? null;
                $placeLng = $coordinates[0] ?? null;

                return [
                    'name' => $properties['name'] ?? 'Unnamed',
                    'address' => $properties['formatted'] ?? ($properties['address_line1'] ?? ''),
                    'distance_m' => ($placeLat !== null && $placeLng !== null)
                        ? (int) round(self::haversineDistanceMeters($lat, $lng, $placeLat, $placeLng))
                        : 0,
                    'phone' => $properties['phone'] ?? null,
                    'website' => $properties['website'] ?? null,
                    'lat' => $placeLat,
                    'lng' => $placeLng,
                    'categories' => $properties['categories'] ?? [],
                    'opening_hours' => $properties['opening_hours'] ?? null,
                ];
            })
            ->filter(fn (array $place) => $place['lat'] !== null && $place['lng'] !== null)
            ->sortBy('distance_m')
            ->values();

        return response()->json($places);
    }

    /**
     * @return array<string, mixed>|false|null false = not found, null = API failure
     */
    private function fetchGeocodeFeature(string $place): array|false|null
    {
        $apiKey = config('services.geoapify.key');

        if (! $apiKey) {
            return null;
        }

        $response = Http::timeout(15)->get('https://api.geoapify.com/v1/geocode/search', [
            'text' => $place,
            'limit' => 1,
            'apiKey' => $apiKey,
            'lang' => 'en',
        ]);

        if (! $response->successful()) {
            Log::warning('Geoapify geocode search failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'place' => $place,
            ]);

            return null;
        }

        $feature = $response->json('features.0');

        return $feature ?: false;
    }

    /**
     * @param  array<string, mixed>  $feature
     * @return array<string, mixed>
     */
    private function formatGeocodeResponse(array $feature, ?string $fallbackLabel = null): array
    {
        $properties = $feature['properties'] ?? [];
        $coordinates = $feature['geometry']['coordinates'] ?? [null, null];
        $parsed = GeoapifyAddress::fromGeocodeProperties($properties);
        $normalized = GeoapifyAddress::normalizeFields([
            ...$parsed,
            'latitude' => $coordinates[1],
            'longitude' => $coordinates[0],
        ]);

        return [
            'lat' => $coordinates[1],
            'lng' => $coordinates[0],
            'label' => $normalized['address_formatted'] ?: ($fallbackLabel ?? ''),
            ...$normalized,
        ];
    }

    /**
     * Straight-line distance in meters between two WGS84 coordinates.
     */
    private static function haversineDistanceMeters(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2,
    ): float {
        $earthRadiusM = 6371000;
        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);

        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lngDelta / 2) ** 2;

        return $earthRadiusM * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
