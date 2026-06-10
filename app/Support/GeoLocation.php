<?php

namespace App\Support;

class GeoLocation
{
    /**
     * Straight-line distance in meters between two WGS84 coordinates (Haversine).
     */
    public static function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000;
        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);

        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lngDelta / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Returns a human-readable distance string, e.g. "1.5 km" or "350 m".
     */
    public static function formatDistance(float $meters): string
    {
        if ($meters >= 1000) {
            return round($meters / 1000, 1).' km';
        }

        return round($meters).' m';
    }

    /**
     * Distance in kilometres, rounded to one decimal.
     */
    public static function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        return round(self::distanceMeters($lat1, $lng1, $lat2, $lng2) / 1000, 1);
    }
}
