<?php

namespace App\Support;

use App\Models\Client;
use App\Models\Pet;
use Illuminate\Database\Eloquent\Builder;

class ClinicPatientScope
{
    /**
     * Pets that have clinical or operational activity at the given clinic.
     * When $clinicId is null (platform admin — all clinics), returns all pets.
     */
    public static function petsQuery(?int $clinicId): Builder
    {
        $query = Pet::query();

        if ($clinicId === null) {
            return $query;
        }

        return $query->where(function (Builder $scope) use ($clinicId): void {
            $scope->whereHas('appointments', fn (Builder $q) => $q->where('clinic_id', $clinicId))
                ->orWhereHas('healthRecords', fn (Builder $q) => $q->where('clinic_id', $clinicId))
                ->orWhereHas('vaccinations', fn (Builder $q) => $q->where('clinic_id', $clinicId))
                ->orWhereHas('groomingRecords', fn (Builder $q) => $q->where('clinic_id', $clinicId))
                ->orWhereHas('billings', fn (Builder $q) => $q->where('clinic_id', $clinicId));
        });
    }

    /**
     * Clients linked to the given clinic through appointments, billing, or pets seen there.
     */
    public static function clientsQuery(?int $clinicId): Builder
    {
        $query = Client::query();

        if ($clinicId === null) {
            return $query;
        }

        $petClientIds = self::petsQuery($clinicId)->select('client_id');

        return $query->where(function (Builder $scope) use ($clinicId, $petClientIds): void {
            $scope->whereHas('appointments', fn (Builder $q) => $q->where('clinic_id', $clinicId))
                ->orWhereHas('billings', fn (Builder $q) => $q->where('clinic_id', $clinicId))
                ->orWhereIn('id', $petClientIds);
        });
    }
}
