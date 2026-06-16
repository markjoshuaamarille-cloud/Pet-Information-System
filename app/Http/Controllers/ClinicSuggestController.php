<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Models\User;
use App\Support\GeoLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClinicSuggestController extends Controller
{
    /** Grooming-type appointment types */
    private const GROOMING_TYPES = ['grooming'];

    /** Veterinary-type appointment types */
    private const VET_TYPES = ['checkup', 'vaccination', 'consultation', 'surgery', 'boarding', 'emergency_care', 'other'];

    public function suggest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string'],
            'lat'  => ['nullable', 'numeric'],
            'lng'  => ['nullable', 'numeric'],
        ]);

        $type = $validated['type'];

        $query = Clinic::active();

        if (in_array($type, self::GROOMING_TYPES, true)) {
            $query->where('has_grooming', true)
                ->whereJsonContains('enabled_modules', 'grooming')
                ->whereJsonContains('enabled_modules', 'scheduling');
        } else {
            $query->where('has_veterinary', true)
                ->whereJsonContains('enabled_modules', 'scheduling');
        }

        $clinics = $query->get([
            'id', 'name', 'address_formatted', 'latitude', 'longitude',
            'has_veterinary', 'has_pet_shop', 'has_grooming', 'enabled_modules',
        ]);

        $userLat = isset($validated['lat']) ? (float) $validated['lat'] : null;
        $userLng = isset($validated['lng']) ? (float) $validated['lng'] : null;

        $clinicIds = $clinics->pluck('id');

        $ratingSummaries = DB::table('appointment_ratings')
            ->join('appointments', 'appointments.id', '=', 'appointment_ratings.appointment_id')
            ->whereIn('appointments.clinic_id', $clinicIds)
            ->groupBy('appointments.clinic_id')
            ->selectRaw('appointments.clinic_id, ROUND(AVG(appointment_ratings.rating), 1) as average_rating, COUNT(*) as rating_count')
            ->get()
            ->keyBy('clinic_id');

        $result = $clinics->map(function (Clinic $clinic) use ($userLat, $userLng, $ratingSummaries): array {
            $distanceKm = null;
            $distanceFormatted = null;

            if ($userLat !== null && $userLng !== null && $clinic->latitude && $clinic->longitude) {
                $meters = GeoLocation::distanceMeters($userLat, $userLng, $clinic->latitude, $clinic->longitude);
                $distanceKm = round($meters / 1000, 1);
                $distanceFormatted = GeoLocation::formatDistance($meters);
            }

            return [
                'id'                 => $clinic->id,
                'name'               => $clinic->name,
                'address'            => $clinic->address_formatted,
                'latitude'           => $clinic->latitude,
                'longitude'          => $clinic->longitude,
                'distance_km'        => $distanceKm,
                'distance_formatted' => $distanceFormatted,
                'has_veterinary'     => $clinic->has_veterinary,
                'has_pet_shop'       => $clinic->has_pet_shop,
                'has_grooming'       => $clinic->has_grooming,
                'average_rating'     => isset($ratingSummaries[$clinic->id])
                    ? (float) $ratingSummaries[$clinic->id]->average_rating
                    : null,
                'rating_count'       => isset($ratingSummaries[$clinic->id])
                    ? (int) $ratingSummaries[$clinic->id]->rating_count
                    : 0,
            ];
        });

        if ($userLat !== null) {
            $result = $result->sortBy('distance_km')->values();
        }

        return response()->json($result);
    }
}
