<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->date('birth_date')->nullable()->after('gender');
            $table->decimal('weight', 8, 2)->nullable()->after('birth_date');
            $table->string('color')->nullable()->after('weight');
            $table->string('microchip_no')->nullable()->unique()->after('color');
            $table->string('vaccination_status')->default('unknown')->after('microchip_no');
        });
    }

    public function down(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->dropColumn([
                'birth_date',
                'weight',
                'color',
                'vaccination_status',
            ]);
            $table->dropUnique('pets_microchip_no_unique');
            $table->dropColumn('microchip_no');
        });
    }
};
