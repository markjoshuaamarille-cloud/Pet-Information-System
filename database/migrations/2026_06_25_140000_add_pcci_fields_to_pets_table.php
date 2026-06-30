<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->string('pcci_reg_no', 100)->nullable()->after('microchip_no');
            $table->string('pcci_certificate_path')->nullable()->after('pcci_reg_no');

            $table->index('pcci_reg_no');
        });
    }

    public function down(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->dropIndex(['pcci_reg_no']);
            $table->dropColumn(['pcci_reg_no', 'pcci_certificate_path']);
        });
    }
};
