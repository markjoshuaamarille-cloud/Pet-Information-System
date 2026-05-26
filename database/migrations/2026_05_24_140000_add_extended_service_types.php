<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "ALTER TABLE appointments MODIFY COLUMN type ENUM(
                'checkup',
                'vaccination',
                'grooming',
                'consultation',
                'surgery',
                'boarding',
                'emergency_care',
                'other'
            ) NOT NULL DEFAULT 'checkup'"
        );

        DB::statement(
            "ALTER TABLE health_records MODIFY COLUMN type ENUM(
                'consultation',
                'vaccination',
                'grooming',
                'medication',
                'surgery',
                'boarding',
                'emergency_care'
            ) NOT NULL"
        );
    }

    public function down(): void
    {
        DB::statement(
            "ALTER TABLE appointments MODIFY COLUMN type ENUM(
                'checkup',
                'vaccination',
                'grooming',
                'consultation',
                'other'
            ) NOT NULL DEFAULT 'checkup'"
        );

        DB::statement(
            "ALTER TABLE health_records MODIFY COLUMN type ENUM(
                'consultation',
                'vaccination',
                'grooming',
                'medication'
            ) NOT NULL"
        );
    }
};
