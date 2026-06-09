<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ClinicScope
{
    /**
     * Staff assigned to clinics must never see unscoped (all-clinic) data when
     * they have no active clinic context — e.g. their only clinic was deactivated.
     */
    public static function restrictsUnscopedData(?User $user): bool
    {
        return $user instanceof User
            && $user->isClinicAssignedStaff()
            && ! $user->isPlatformAdmin();
    }

    public static function forClinicQuery(Builder $query, ?int $clinicId, ?User $user): Builder
    {
        if (self::restrictsUnscopedData($user) && $clinicId === null) {
            return $query->whereRaw('0 = 1');
        }

        return $query->forClinic($clinicId);
    }
}
