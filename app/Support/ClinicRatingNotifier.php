<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ClinicRatingNotifier
{
    public static function appointmentRated(Appointment $appointment, int $stars, User $customer): void
    {
        $clinicId = $appointment->clinic_id;

        if (! $clinicId) {
            return;
        }

        $stats = self::clinicRatingStats($clinicId);

        SystemNotification::create([
            'clinic_id' => $clinicId,
            'type' => 'clinic_rating',
            'severity' => match (true) {
                $stars >= 4 => 'info',
                $stars === 3 => 'warning',
                default => 'danger',
            },
            'title' => "{$stars}-Star Customer Rating",
            'message' => sprintf(
                '%s rated their completed visit %d/5. Your clinic now averages %s stars from %d %s.',
                $customer->name,
                $stars,
                number_format($stats['average_rating'], 1),
                $stats['rating_count'],
                $stats['rating_count'] === 1 ? 'review' : 'reviews',
            ),
            'pet_id' => $appointment->pet_id,
            'client_id' => $appointment->client_id,
            'sent_at' => now(),
        ]);
    }

    /**
     * @return array{average_rating: float, rating_count: int}
     */
    public static function clinicRatingStats(int $clinicId): array
    {
        $row = DB::table('appointment_ratings')
            ->join('appointments', 'appointments.id', '=', 'appointment_ratings.appointment_id')
            ->where('appointments.clinic_id', $clinicId)
            ->selectRaw('ROUND(AVG(appointment_ratings.rating), 1) as average_rating, COUNT(*) as rating_count')
            ->first();

        return [
            'average_rating' => (float) ($row->average_rating ?? 0),
            'rating_count' => (int) ($row->rating_count ?? 0),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function displayFields(SystemNotification $notification): array
    {
        preg_match('/^(\d)-Star/', (string) $notification->title, $starMatch);
        preg_match(
            '/averages?\s+([\d.]+)\s+stars?\s+from\s+(\d+)/i',
            (string) $notification->message,
            $statsMatch,
        );

        return [
            'rating_stars' => isset($starMatch[1]) ? (int) $starMatch[1] : null,
            'average_rating' => isset($statsMatch[1]) ? (float) $statsMatch[1] : null,
            'rating_count' => isset($statsMatch[2]) ? (int) $statsMatch[2] : null,
            'action_href' => route('appointments.index'),
            'action_label' => 'View appointments',
        ];
    }
}
