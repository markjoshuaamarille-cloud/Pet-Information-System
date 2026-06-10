<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'appointments',
        'health_records',
        'vaccinations',
        'grooming_records',
        'billings',
        'medicines',
        'service_catalogs',
        'system_notifications',
        'usability_surveys',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreignId('clinic_id')->nullable()->after('id')->constrained()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropForeign(['clinic_id']);
                $blueprint->dropColumn('clinic_id');
            });
        }
    }
};
