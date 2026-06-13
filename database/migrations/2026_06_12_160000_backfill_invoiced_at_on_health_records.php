<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('health_records')
            ->whereNotNull('billing_id')
            ->whereNull('invoiced_at')
            ->update(['invoiced_at' => now()]);
    }

    public function down(): void
    {
        // Non-reversible data repair.
    }
};
