<?php

use App\Models\Clinic;
use App\Support\ServiceCatalogDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_catalogs', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->unique(['clinic_id', 'code']);
        });

        Clinic::query()->pluck('id')->each(function (int $clinicId): void {
            ServiceCatalogDefaults::seedForClinic($clinicId);
        });
    }

    public function down(): void
    {
        Schema::table('service_catalogs', function (Blueprint $table) {
            $table->dropUnique(['clinic_id', 'code']);
            $table->unique('code');
        });
    }
};
