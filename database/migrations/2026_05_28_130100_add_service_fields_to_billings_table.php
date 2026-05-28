<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->foreignId('service_catalog_id')
                ->nullable()
                ->after('appointment_id')
                ->constrained('service_catalogs')
                ->nullOnDelete();
            $table->decimal('service_unit_price', 10, 2)->default(0)->after('service_catalog_id');
            $table->unsignedInteger('service_quantity')->default(1)->after('service_unit_price');
        });
    }

    public function down(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_catalog_id');
            $table->dropColumn(['service_unit_price', 'service_quantity']);
        });
    }
};
