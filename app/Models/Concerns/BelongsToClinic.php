<?php

namespace App\Models\Concerns;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToClinic
{
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /**
     * Scope records to a specific clinic. Passing null returns all records (admin view).
     */
    public function scopeForClinic(Builder $query, ?int $clinicId): Builder
    {
        if ($clinicId === null) {
            return $query;
        }

        return $query->where($this->getTable().'.clinic_id', $clinicId);
    }
}
