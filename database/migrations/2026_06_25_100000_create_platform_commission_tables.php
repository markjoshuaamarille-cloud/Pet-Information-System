<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('default_commission_rate', 5, 2)->default(20.00);
            $table->timestamps();
        });

        DB::table('platform_settings')->insert([
            'default_commission_rate' => 20.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::create('platform_commission_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('receipt_number')->unique();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->unsignedInteger('transaction_count')->default(0);
            $table->decimal('total_gross', 12, 2)->default(0);
            $table->decimal('total_commission', 12, 2)->default(0);
            $table->decimal('total_business_earnings', 12, 2)->default(0);
            $table->decimal('amount_received', 12, 2);
            $table->string('payment_method');
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('paid_at');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('platform_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('billing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('settlement_id')->nullable()->constrained('platform_commission_settlements')->nullOnDelete();
            $table->string('invoice_number')->nullable();
            $table->string('sale_type', 50);
            $table->string('business_line', 50);
            $table->decimal('transaction_amount', 12, 2);
            $table->decimal('commission_rate', 5, 2);
            $table->decimal('commission_amount', 12, 2);
            $table->decimal('business_earnings', 12, 2);
            $table->timestamp('transaction_at');
            $table->timestamps();

            $table->index(['clinic_id', 'transaction_at']);
            $table->index(['settlement_id']);
            $table->index(['business_line', 'transaction_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_commissions');
        Schema::dropIfExists('platform_commission_settlements');
        Schema::dropIfExists('platform_settings');
    }
};
