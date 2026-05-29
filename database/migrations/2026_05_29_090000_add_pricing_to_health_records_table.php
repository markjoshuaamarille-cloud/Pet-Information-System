<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('health_records', function (Blueprint $table) {
            $table->foreignId('service_catalog_id')
                ->nullable()
                ->after('medicine_id')
                ->constrained('service_catalogs')
                ->nullOnDelete();
            $table->decimal('unit_price', 10, 2)->default(0)->after('medication_quantity');
            $table->unsignedInteger('quantity')->default(1)->after('unit_price');
            $table->decimal('line_total', 10, 2)->default(0)->after('quantity');
            $table->foreignId('billing_id')
                ->nullable()
                ->after('line_total')
                ->constrained('billings')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('health_records', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_catalog_id');
            $table->dropConstrainedForeignId('billing_id');
            $table->dropColumn(['unit_price', 'quantity', 'line_total']);
        });
    }
};
