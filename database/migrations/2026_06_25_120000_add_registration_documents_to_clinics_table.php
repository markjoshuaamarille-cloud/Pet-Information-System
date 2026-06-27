<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->string('barangay_clearance_path')->nullable()->after('submitted_by_user_id');
            $table->string('business_permit_path')->nullable()->after('barangay_clearance_path');
            $table->json('other_requirements')->nullable()->after('business_permit_path');
        });
    }

    public function down(): void
    {
        Schema::table('clinics', function (Blueprint $table) {
            $table->dropColumn([
                'barangay_clearance_path',
                'business_permit_path',
                'other_requirements',
            ]);
        });
    }
};
