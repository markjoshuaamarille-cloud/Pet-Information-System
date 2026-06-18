<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // For clients table — add columns ONLY if they don't exist
        if (Schema::hasTable('clients')) {
            Schema::table('clients', function (Blueprint $table) {
                if (!Schema::hasColumn('clients', 'address_line1')) {
                    $table->string('address_line1')->nullable()->after('address');
                }
                if (!Schema::hasColumn('clients', 'address_line2')) {
                    $table->string('address_line2')->nullable()->after('address_line1');
                }
                if (!Schema::hasColumn('clients', 'barangay')) {
                    $table->string('barangay')->nullable()->after('address_line2');
                }
                if (!Schema::hasColumn('clients', 'city')) {
                    $table->string('city')->nullable()->after('barangay');
                }
                if (!Schema::hasColumn('clients', 'province')) {
                    $table->string('province')->nullable()->after('city');
                }
                if (!Schema::hasColumn('clients', 'postal_code')) {
                    $table->string('postal_code', 20)->nullable()->after('province');
                }
                if (!Schema::hasColumn('clients', 'country')) {
                    $table->string('country')->default('Philippines')->after('postal_code');
                }
            });
        }

        // For clinics table — skip if table does not exist
        if (Schema::hasTable('clinics')) {
            Schema::table('clinics', function (Blueprint $table) {
                if (!Schema::hasColumn('clinics', 'address_line1')) {
                    $table->string('address_line1')->nullable()->after('address');
                }
                if (!Schema::hasColumn('clinics', 'address_line2')) {
                    $table->string('address_line2')->nullable()->after('address_line1');
                }
                if (!Schema::hasColumn('clinics', 'barangay')) {
                    $table->string('barangay')->nullable()->after('address_line2');
                }
                if (!Schema::hasColumn('clinics', 'city')) {
                    $table->string('city')->nullable()->after('barangay');
                }
                if (!Schema::hasColumn('clinics', 'province')) {
                    $table->string('province')->nullable()->after('city');
                }
                if (!Schema::hasColumn('clinics', 'postal_code')) {
                    $table->string('postal_code', 20)->nullable()->after('province');
                }
                if (!Schema::hasColumn('clinics', 'country')) {
                    $table->string('country')->default('Philippines')->after('postal_code');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('clients')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->dropColumn([
                    'address_line1',
                    'address_line2',
                    'barangay',
                    'city',
                    'province',
                    'postal_code',
                    'country',
                ]);
            });
        }

        if (Schema::hasTable('clinics')) {
            Schema::table('clinics', function (Blueprint $table) {
                $table->dropColumn([
                    'address_line1',
                    'address_line2',
                    'barangay',
                    'city',
                    'province',
                    'postal_code',
                    'country',
                ]);
            });
        }
    }
};
