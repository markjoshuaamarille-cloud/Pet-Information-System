<?php

use App\Support\ClinicServices;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_catalogs', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('category')->default('general');
            $table->decimal('default_price', 10, 2)->default(0);
            $table->timestamps();
        });

        $now = now();
        $defaults = array_map(
            fn (array $service): array => [
                'code' => $service['code'],
                'name' => $service['name'],
                'category' => $service['category'],
                'default_price' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            ClinicServices::catalogDefaults(),
        );

        if (! empty($defaults)) {
            DB::table('service_catalogs')->insert($defaults);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('service_catalogs');
    }
};
