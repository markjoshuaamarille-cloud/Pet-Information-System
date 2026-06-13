<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('health_records', function (Blueprint $table) {
            $table->timestamp('invoiced_at')->nullable()->after('billing_id');
        });

        DB::table('health_records')
            ->whereNotNull('billing_id')
            ->update(['invoiced_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('health_records', function (Blueprint $table) {
            $table->dropColumn('invoiced_at');
        });
    }
};
