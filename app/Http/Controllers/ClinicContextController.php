<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ClinicContextController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return redirect()->back();
        }

        $clinicId = $request->input('clinic_id');

        if ($user->isPlatformAdmin()) {
            // Admin can switch to any clinic or clear (null = all clinics)
            $request->session()->put('active_clinic_id', $clinicId ?: null);
        } else {
            // Non-admin must own that clinic assignment and it must be active
            $assignedIds = $user->clinics()
                ->where('clinics.status', 'active')
                ->pluck('clinics.id')
                ->all();

            if ($clinicId && in_array((int) $clinicId, $assignedIds, true)) {
                $request->session()->put('active_clinic_id', (int) $clinicId);
            } elseif ($clinicId) {
                return redirect()->back()->with('error', 'You cannot switch to that clinic.');
            }
        }

        return redirect()->back()->with('success', 'Clinic context updated.');
    }
}
