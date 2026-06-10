<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinics', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('contact')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->text('address')->nullable();
            $table->string('address_formatted')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('geoapify_place_id')->nullable();
            $table->string('geoapify_label')->nullable();
            $table->boolean('has_veterinary')->default(false);
            $table->boolean('has_pet_shop')->default(false);
            $table->boolean('has_grooming')->default(false);
            $table->json('enabled_modules')->nullable();
            $table->enum('status', ['pending', 'active', 'rejected', 'inactive'])->default('pending');
            $table->foreignId('submitted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinics');
    }
};
