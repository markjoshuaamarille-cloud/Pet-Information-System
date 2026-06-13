<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('billing_status', 20)->nullable()->after('status');
        });

        $latestBillings = DB::table('billings')
            ->select('appointment_id', 'status')
            ->whereNotNull('appointment_id')
            ->where('sale_type', 'clinic_service')
            ->where('status', '!=', 'cancelled')
            ->orderByDesc('id')
            ->get()
            ->unique('appointment_id');

        foreach ($latestBillings as $billing) {
            DB::table('appointments')
                ->where('id', $billing->appointment_id)
                ->whereNull('billing_status')
                ->update(['billing_status' => $billing->status]);
        }
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('billing_status');
        });
    }
};
