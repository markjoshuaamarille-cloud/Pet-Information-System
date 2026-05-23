<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vaccinations', function (Blueprint $table) {
            $table->foreignId('medicine_id')->nullable()->after('appointment_id')->constrained('medicines')->nullOnDelete();
            $table->unsignedInteger('quantity_used')->default(1)->after('dose');
        });

        DB::table('vaccinations')
            ->whereNull('quantity_used')
            ->update(['quantity_used' => 1]);
    }

    public function down(): void
    {
        Schema::table('vaccinations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('medicine_id');
            $table->dropColumn('quantity_used');
        });
    }
};
