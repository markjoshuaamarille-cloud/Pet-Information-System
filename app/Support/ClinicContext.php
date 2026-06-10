<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

class ClinicContext
{
    public static function activeClinicId(Request $request): ?int
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        if ($clinicId) {
            return (int) $clinicId;
        }

        $user = $request->user();

        if (! $user instanceof User || $user->isPlatformAdmin() || $user->isCustomer()) {
            return null;
        }

        if (! $user->clinics()->exists()) {
            return null;
        }

        $primaryId = $user->clinics()
            ->where('clinics.status', 'active')
            ->wherePivot('is_primary', true)
            ->value('clinics.id');

        if ($primaryId) {
            return (int) $primaryId;
        }

        $firstId = $user->clinics()
            ->where('clinics.status', 'active')
            ->orderBy('clinics.id')
            ->value('clinics.id');

        return $firstId ? (int) $firstId : null;
    }
}
