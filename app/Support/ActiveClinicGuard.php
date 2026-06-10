<?php

namespace App\Support;

use App\Models\Clinic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ActiveClinicGuard
{
    public static function isOperational(?int $clinicId): bool
    {
        if (! $clinicId) {
            return true;
        }

        $clinic = Clinic::query()->whereKey($clinicId)->value('status');

        return $clinic === 'active';
    }

    public static function clinicIdsFromRequest(Request $request): array
    {
        $ids = [];

        $activeClinicId = $request->attributes->get('active_clinic_id');
        if ($activeClinicId) {
            $ids[] = (int) $activeClinicId;
        }

        $inputClinicId = $request->input('clinic_id');
        if ($inputClinicId) {
            $ids[] = (int) $inputClinicId;
        }

        return array_values(array_unique(array_filter($ids)));
    }

    public static function blockedResponse(Request $request): RedirectResponse
    {
        return redirect()
            ->back()
            ->with('error', 'This clinic is deactivated and cannot accept appointments, transactions, or other new activity.');
    }
}
