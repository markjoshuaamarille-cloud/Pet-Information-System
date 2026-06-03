<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Appointment;
use App\Models\Billing;
use App\Models\Pet;
use App\Models\User;

trait InteractsWithClinicUsers
{
    protected function currentUser(): ?User
    {
        $user = auth()->user();

        return $user instanceof User ? $user : null;
    }

    protected function customerClientId(User $user): int
    {
        if (! $user->client_id) {
            abort(403, 'Your customer account is not linked to a client record.');
        }

        return (int) $user->client_id;
    }

    protected function ensureCustomerOwnsPet(?User $user, Pet $pet): void
    {
        if (! $user?->isCustomer()) {
            return;
        }

        if ((int) $pet->client_id !== $this->customerClientId($user)) {
            abort(403, 'You do not have permission to access this pet.');
        }
    }

    protected function ensureCustomerOwnsAppointment(?User $user, Appointment $appointment): void
    {
        if (! $user?->isCustomer()) {
            return;
        }

        if ((int) $appointment->client_id !== $this->customerClientId($user)) {
            abort(403, 'You do not have permission to access this appointment.');
        }
    }

    protected function ensureCustomerOwnsBilling(?User $user, Billing $billing): void
    {
        if (! $user?->isCustomer()) {
            return;
        }

        if ((int) $billing->client_id !== $this->customerClientId($user)) {
            abort(403, 'You can only access your own billing records.');
        }
    }

    protected function normalizeMicrochipNo(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = trim($value);
        if ($normalized === '') {
            return null;
        }

        $placeholderValues = ['n/a', 'na', 'none', 'unknown', '-'];
        if (in_array(strtolower($normalized), $placeholderValues, true)) {
            return null;
        }

        return $normalized;
    }
}
