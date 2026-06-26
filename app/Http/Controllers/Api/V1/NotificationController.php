<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\NotificationController as WebNotificationController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Notifications
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $controller = app(WebNotificationController::class);
        $user = $this->currentUser();

        if ($user?->isCustomer()) {
            $notifications = $user->client_id
                ? $controller->customerNotifications((int) $user->client_id)
                : [];

            return $this->success([
                'notifications' => $notifications,
                'is_customer' => true,
            ]);
        }

        return $this->success([
            'notifications' => $controller->staffNotificationsForRequest($request),
            'is_customer' => false,
        ]);
    }
}
