<?php

namespace App\Support;

use App\Models\Clinic;
use App\Models\SystemNotification;
use App\Models\User;

class PlatformAdminNotifier
{
    public static function clinicOwnerRegistered(User $user): void
    {
        SystemNotification::create([
            'type' => 'clinic_owner_application',
            'severity' => 'warning',
            'title' => 'New Clinic Owner Application',
            'message' => sprintf(
                '%s applied for a clinic owner account. Email: %s | Contact: %s. Review and activate in Admin Users.',
                $user->name,
                $user->email,
                $user->contact ?? '—',
            ),
            'sent_at' => now(),
        ]);
    }

    public static function clinicRegistrationSubmitted(Clinic $clinic, ?User $submitter = null): void
    {
        $submitterLabel = $submitter
            ? sprintf('%s (%s)', $submitter->name, $submitter->email)
            : 'Unknown submitter';

        SystemNotification::create([
            'type' => 'clinic_registration',
            'severity' => 'warning',
            'title' => 'New Clinic Registration',
            'message' => sprintf(
                '%s submitted clinic registration for "%s". Review in Clinic Management.',
                $submitterLabel,
                $clinic->name,
            ),
            'sent_at' => now(),
        ]);
    }

    /**
     * @return array{pending_clinic_owners: int, pending_clinics: int, total: int}
     */
    public static function pendingSummary(): array
    {
        $pendingClinicOwners = User::query()
            ->where('role', 'clinic_owner')
            ->where('is_active', false)
            ->count();

        $pendingClinics = Clinic::query()
            ->where('status', 'pending')
            ->count();

        return [
            'pending_clinic_owners' => $pendingClinicOwners,
            'pending_clinics' => $pendingClinics,
            'total' => $pendingClinicOwners + $pendingClinics,
        ];
    }
}
