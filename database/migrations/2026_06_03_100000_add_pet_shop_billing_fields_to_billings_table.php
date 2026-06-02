<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->boolean('tax_applied')->default(false)->after('tax');
            $table->decimal('tax_rate', 5, 2)->default(12)->after('tax_applied');
            $table->boolean('inventory_deducted')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->dropColumn(['tax_applied', 'tax_rate', 'inventory_deducted']);
        });
    }
};
