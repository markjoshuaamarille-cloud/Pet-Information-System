<?php

namespace App\Http\Controllers;

use App\Models\Medicine;
use App\Models\SystemNotification;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(): Response
    {
        $expired = Medicine::expired()->orderBy('expiry_date')->get();
        $critical = Medicine::criticalStock()->whereDate('expiry_date', '>=', now())->orderBy('quantity')->get();
        $expiringSoon = Medicine::expiringSoon()->whereDate('expiry_date', '>=', now())->get();

        $notifications = collect();

        foreach ($expired as $medicine) {
            $notifications->push([
                'type' => 'expired',
                'severity' => 'danger',
                'message' => "{$medicine->name} has expired (".Carbon::parse($medicine->expiry_date)->format('M d, Y').").",
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
            /** @var Medicine $medicine */
            if (! $medicine->isCriticalStock()) {
                $notifications->push([
                    'type' => 'expiring_soon',
                    'severity' => 'info',
                    'message' => "{$medicine->name} expires on ".Carbon::parse($medicine->expiry_date)->format('M d, Y').".",
                    'medicine' => $medicine,
                ]);
            }
        }

        $systemNotifications = SystemNotification::with(['pet', 'client'])
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (SystemNotification $notification) => [
                'type' => $notification->type,
                'severity' => $notification->severity,
                'message' => $notification->message,
                'title' => $notification->title,
                'created_at' => $notification->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications->concat($systemNotifications)->values(),
        ]);
    }
}
