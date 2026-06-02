<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->string('sale_type')->default('clinic_service')->after('invoice_number');
        });
    }

    public function down(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->dropColumn('sale_type');
        });
    }
};
