<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('health_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medicine_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['consultation', 'vaccination', 'grooming', 'medication']);
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('dosage')->nullable();
            $table->date('record_date');
            $table->date('next_due_date')->nullable();
            $table->text('veterinarian_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('health_records');
    }
};
