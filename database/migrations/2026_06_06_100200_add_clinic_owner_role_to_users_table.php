<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // For MySQL ENUM we must use a raw statement to add the new value
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','veterinarian','receptionist','groomer','customer','cashier','clinic_owner') DEFAULT 'customer'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','veterinarian','receptionist','groomer','customer','cashier') DEFAULT 'customer'");
    }
};
