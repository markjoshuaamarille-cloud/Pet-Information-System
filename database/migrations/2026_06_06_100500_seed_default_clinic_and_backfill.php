<?php

use App\Models\Clinic;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // Create the default clinic representing the original single-clinic deployment
        $clinicId = DB::table('clinics')->insertGetId([
            'name'             => 'Main Clinic',
            'slug'             => 'main-clinic',
            'status'           => 'active',
            'has_veterinary'   => true,
            'has_pet_shop'     => true,
            'has_grooming'     => true,
            'enabled_modules'  => json_encode([
                'dashboard', 'scheduling', 'vaccinations', 'grooming',
                'pet_shop', 'pet_shop_billing', 'inventory', 'service_catalog',
                'pets', 'reports', 'notifications', 'survey', 'billing',
            ]),
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        // Backfill clinic_id on all scoped tables
        $tables = [
            'appointments',
            'health_records',
            'vaccinations',
            'grooming_records',
            'billings',
            'medicines',
            'service_catalogs',
            'system_notifications',
            'usability_surveys',
        ];

        foreach ($tables as $table) {
            DB::table($table)->whereNull('clinic_id')->update(['clinic_id' => $clinicId]);
        }

        // Assign all existing staff users to the default clinic
        $staffRoles = ['super_admin', 'veterinarian', 'receptionist', 'groomer', 'cashier', 'clinic_owner'];
        $staffUserIds = DB::table('users')->whereIn('role', $staffRoles)->pluck('id');

        foreach ($staffUserIds as $userId) {
            DB::table('clinic_user')->insertOrIgnore([
                'clinic_id'  => $clinicId,
                'user_id'    => $userId,
                'is_primary' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Remove the default clinic (cascades will clear clinic_user; set clinic_id back to null on scoped tables)
        DB::table('clinics')->where('slug', 'main-clinic')->delete();
    }
};
