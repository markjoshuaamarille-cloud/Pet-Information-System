<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grooming_records', function (Blueprint $table) {
            if (! Schema::hasColumn('grooming_records', 'groomer_id')) {
                $table->foreignId('groomer_id')
                    ->nullable()
                    ->after('appointment_id')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('grooming_records', function (Blueprint $table) {
            if (Schema::hasColumn('grooming_records', 'groomer_id')) {
                $table->dropForeign(['groomer_id']);
                $table->dropColumn('groomer_id');
            }
        });
    }
};
