<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('medical_history');
            $table->timestamp('deactivated_at')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->dropColumn(['is_active', 'deactivated_at']);
        });
    }
};
