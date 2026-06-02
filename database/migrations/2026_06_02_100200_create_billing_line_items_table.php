<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_line_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('billing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('medicine_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('line_total', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('billing_line_items');
    }
};
