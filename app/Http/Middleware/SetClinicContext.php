<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetClinicContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return $next($request);
        }

        // Super admins can switch to any clinic (or "all")
        if ($user->hasRole('super_admin')) {
            $sessionClinicId = $request->session()->get('active_clinic_id');
            $request->attributes->set('active_clinic_id', $sessionClinicId ? (int) $sessionClinicId : null);

            return $next($request);
        }

        // Staff/clinic_owner: resolve from session (must be one of their assigned clinics)
        $sessionClinicId = $request->session()->get('active_clinic_id');

        $assignedIds = $user->clinics()->pluck('clinics.id')->all();

        if ($sessionClinicId && in_array((int) $sessionClinicId, $assignedIds, true)) {
            $request->attributes->set('active_clinic_id', (int) $sessionClinicId);
        } elseif (! empty($assignedIds)) {
            // Auto-select primary or first assigned clinic
            $primaryId = $user->clinics()->wherePivot('is_primary', true)->value('clinics.id');
            $clinicId = $primaryId ?? $assignedIds[0];
            $request->session()->put('active_clinic_id', $clinicId);
            $request->attributes->set('active_clinic_id', $clinicId);
        } else {
            $request->attributes->set('active_clinic_id', null);
        }

        return $next($request);
    }
}
