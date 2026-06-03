<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\NotificationController as WebNotificationController;
use Illuminate\Http\JsonResponse;

/**
 * @group Notifications
 */
class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $controller = app(WebNotificationController::class);
        $reflection = new \ReflectionClass($controller);

        $user = $this->currentUser();

        if ($user?->isCustomer()) {
            $method = $reflection->getMethod('customerNotifications');
            $method->setAccessible(true);
            $notifications = $user->client_id
                ? $method->invoke($controller, (int) $user->client_id)
                : [];

            return $this->success([
                'notifications' => $notifications,
                'is_customer' => true,
            ]);
        }

        return $this->success([
            'notifications' => $this->staffNotifications(),
            'is_customer' => false,
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function staffNotifications(): array
    {
        $expired = \App\Models\Medicine::expired()->orderBy('expiry_date')->get();
        $critical = \App\Models\Medicine::criticalStock()->whereDate('expiry_date', '>=', now())->orderBy('quantity')->get();
        $expiringSoon = \App\Models\Medicine::expiringSoon()->whereDate('expiry_date', '>=', now())->get();

        $notifications = collect();

        foreach ($expired as $medicine) {
            $notifications->push([
                'type' => 'expired',
                'severity' => 'danger',
                'message' => "{$medicine->name} has expired (".\Illuminate\Support\Carbon::parse($medicine->expiry_date)->format('M d, Y').').',
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
                    'message' => "{$medicine->name} expires on ".\Illuminate\Support\Carbon::parse($medicine->expiry_date)->format('M d, Y').'.',
                    'medicine' => $medicine,
                ]);
            }
        }

        $systemNotifications = \App\Models\SystemNotification::with(['pet', 'client'])
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($notification) => [
                'type' => $notification->type,
                'severity' => $notification->severity,
                'message' => $notification->message,
                'title' => $notification->title,
                'created_at' => $notification->created_at?->toIso8601String(),
            ]);

        return $notifications->concat($systemNotifications)->values()->all();
    }
}
