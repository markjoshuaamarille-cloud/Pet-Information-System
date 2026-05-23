<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccinations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('vaccine_name');
            $table->string('dose')->nullable();
            $table->date('administered_on');
            $table->date('next_due_date')->nullable();
            $table->enum('status', ['scheduled', 'completed', 'missed'])->default('scheduled');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['pet_id', 'administered_on']);
            $table->index(['status', 'next_due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccinations');
    }
};
