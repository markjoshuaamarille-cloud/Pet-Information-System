<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('clinics')) {
            return;
        }

        Schema::table('clinics', function (Blueprint $table) {
            if (! Schema::hasColumn('clinics', 'address_line1')) {
                $table->string('address_line1')->nullable()->after('address');
            }
            if (! Schema::hasColumn('clinics', 'address_line2')) {
                $table->string('address_line2')->nullable()->after('address_line1');
            }
            if (! Schema::hasColumn('clinics', 'barangay')) {
                $table->string('barangay')->nullable()->after('address_line2');
            }
            if (! Schema::hasColumn('clinics', 'city')) {
                $table->string('city')->nullable()->after('barangay');
            }
            if (! Schema::hasColumn('clinics', 'province')) {
                $table->string('province')->nullable()->after('city');
            }
            if (! Schema::hasColumn('clinics', 'postal_code')) {
                $table->string('postal_code', 20)->nullable()->after('province');
            }
            if (! Schema::hasColumn('clinics', 'country')) {
                $table->string('country')->default('Philippines')->after('postal_code');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('clinics')) {
            return;
        }

        Schema::table('clinics', function (Blueprint $table) {
            $columns = array_filter([
                Schema::hasColumn('clinics', 'address_line1') ? 'address_line1' : null,
                Schema::hasColumn('clinics', 'address_line2') ? 'address_line2' : null,
                Schema::hasColumn('clinics', 'barangay') ? 'barangay' : null,
                Schema::hasColumn('clinics', 'city') ? 'city' : null,
                Schema::hasColumn('clinics', 'province') ? 'province' : null,
                Schema::hasColumn('clinics', 'postal_code') ? 'postal_code' : null,
                Schema::hasColumn('clinics', 'country') ? 'country' : null,
            ]);

            if ($columns !== []) {
                $table->dropColumn(array_values($columns));
            }
        });
    }
};
