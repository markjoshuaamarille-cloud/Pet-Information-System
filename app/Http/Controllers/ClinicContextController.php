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
            // Non-admin must own that clinic assignment
            $assignedIds = $user->clinics()->pluck('clinics.id')->all();

            if ($clinicId && in_array((int) $clinicId, $assignedIds, true)) {
                $request->session()->put('active_clinic_id', (int) $clinicId);
            }
        }

        return redirect()->back()->with('success', 'Clinic context updated.');
    }
}
