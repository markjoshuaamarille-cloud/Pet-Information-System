<?php

namespace App\Support;

use App\Models\Medicine;
use App\Models\SystemNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class StaffNotificationBuilder
{
    /** @var list<string> */
    private const PLATFORM_TYPES = [
        'clinic_owner_application',
        'clinic_registration',
    ];

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public static function build(?int $clinicId, bool $isPlatformAdmin): Collection
    {
        $notifications = collect();

        if ($clinicId) {
            $notifications = $notifications->concat(self::medicineAlerts($clinicId));
            $notifications = $notifications->concat(
                self::mapSystemNotifications(
                    self::clinicSystemNotifications($clinicId),
                    $isPlatformAdmin,
                ),
            );
        }

        if ($isPlatformAdmin) {
            $notifications = $notifications->concat(
                self::mapSystemNotifications(
                    self::platformSystemNotifications(),
                    true,
                ),
            );
        }

        if ($isPlatformAdmin) {
            return $notifications->sortBy(function (array $item) {
                return in_array($item['type'] ?? '', self::PLATFORM_TYPES, true) ? 0 : 1;
            })->values();
        }

        return $notifications->values();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function medicineAlerts(int $clinicId): Collection
    {
        $notifications = collect();

        $expired = Medicine::expired()->forClinic($clinicId)->orderBy('expiry_date')->get();
        $critical = Medicine::criticalStock()->forClinic($clinicId)->whereDate('expiry_date', '>=', now())->orderBy('quantity')->get();
        $expiringSoon = Medicine::expiringSoon()->forClinic($clinicId)->whereDate('expiry_date', '>=', now())->get();

        foreach ($expired as $medicine) {
            $notifications->push([
                'type' => 'expired',
                'severity' => 'danger',
                'message' => "{$medicine->name} has expired (".Carbon::parse($medicine->expiry_date)->format('M d, Y').').',
                'medicine' => $medicine,
            ]);
        }

        foreach ($critical as $medicine) {
            $notifications->push([
                'type' => 'critical_stock',
                'severity' => 'warning',
                'message' => "{$medicine->name} is at critical stock level ({$medicine->quantity} {$medicine->unit} remaining).",
                'medicine' => $medicine,
            ]);
        }

        foreach ($expiringSoon as $medicine) {
            if (! $medicine->isCriticalStock()) {
                $notifications->push([
                    'type' => 'expiring_soon',
                    'severity' => 'info',
                    'message' => "{$medicine->name} expires on ".Carbon::parse($medicine->expiry_date)->format('M d, Y').'.',
                    'medicine' => $medicine,
                ]);
            }
        }

        return $notifications;
    }

    /**
     * @return Collection<int, SystemNotification>
     */
    private static function clinicSystemNotifications(int $clinicId): Collection
    {
        return SystemNotification::query()
            ->with(['pet', 'client'])
            ->where('clinic_id', $clinicId)
            ->latest()
            ->limit(50)
            ->get();
    }

    /**
     * @return Collection<int, SystemNotification>
     */
    private static function platformSystemNotifications(): Collection
    {
        return SystemNotification::query()
            ->with(['pet', 'client'])
            ->whereNull('clinic_id')
            ->whereIn('type', self::PLATFORM_TYPES)
            ->latest()
            ->limit(50)
            ->get();
    }

    /**
     * @param  Collection<int, SystemNotification>  $records
     * @return Collection<int, array<string, mixed>>
     */
    private static function mapSystemNotifications(Collection $records, bool $isPlatformAdmin): Collection
    {
        return $records->map(function (SystemNotification $notification) use ($isPlatformAdmin) {
            $item = [
                'id' => 'system-'.$notification->id,
                'type' => $notification->type,
                'severity' => $notification->severity,
                'message' => $notification->message,
                'title' => $notification->title,
                'created_at' => $notification->created_at?->toIso8601String(),
                'clinic_id' => $notification->clinic_id,
            ];

            if ($notification->type === 'clinic_rating') {
                return array_merge($item, ClinicRatingNotifier::displayFields($notification));
            }

            if ($isPlatformAdmin) {
                $item['action_href'] = match ($notification->type) {
                    'clinic_owner_application' => route('admin.users.index'),
                    'clinic_registration' => route('admin.clinics.index'),
                    default => null,
                };
            }

            return $item;
        });
    }
}
