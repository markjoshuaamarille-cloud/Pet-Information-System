<?php

use App\Models\Clinic;
use App\Support\ServiceCatalogDefaults;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Clinic::query()->pluck('id')->each(function (int $clinicId): void {
            ServiceCatalogDefaults::seedForClinic($clinicId);
        });
    }

    public function down(): void
    {
        // Non-destructive: new catalog entries are not removed on rollback.
    }
};
