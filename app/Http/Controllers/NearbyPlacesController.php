<?php

namespace App\Http\Controllers;

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

        $apiKey = config('services.geoapify.key');

        if (! $apiKey) {
            return response()->json([
                'message' => 'Place search is not configured. Please contact the administrator.',
            ], 503);
        }

        $response = Http::timeout(15)->get('https://api.geoapify.com/v1/geocode/search', [
            'text' => $validated['place'],
            'limit' => 1,
            'apiKey' => $apiKey,
            'lang' => 'en',
        ]);

        if (! $response->successful()) {
            Log::warning('Geoapify geocode search failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'place' => $validated['place'],
            ]);

            return response()->json([
                'message' => 'Unable to find that place. Please try again.',
            ], 502);
        }

        $feature = $response->json('features.0');

        if (! $feature) {
            return response()->json([
                'message' => 'No location found for that place name. Try a city or area name.',
            ], 404);
        }

        $properties = $feature['properties'] ?? [];
        $coordinates = $feature['geometry']['coordinates'] ?? [null, null];

        return response()->json([
            'lat' => $coordinates[1],
            'lng' => $coordinates[0],
            'label' => $properties['formatted'] ?? $validated['place'],
        ]);
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
