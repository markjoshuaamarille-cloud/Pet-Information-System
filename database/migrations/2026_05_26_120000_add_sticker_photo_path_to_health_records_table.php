<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('health_records', function (Blueprint $table) {
            $table->string('sticker_photo_path')->nullable()->after('veterinarian_notes');
        });
    }

    public function down(): void
    {
        Schema::table('health_records', function (Blueprint $table) {
            $table->dropColumn('sticker_photo_path');
        });
    }
};
