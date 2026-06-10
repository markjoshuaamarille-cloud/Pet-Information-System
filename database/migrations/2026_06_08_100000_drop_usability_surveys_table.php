<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('usability_surveys');

        DB::table('clinics')
            ->select(['id', 'enabled_modules'])
            ->orderBy('id')
            ->each(function (object $clinic): void {
                $modules = json_decode($clinic->enabled_modules ?? '[]', true);

                if (! is_array($modules)) {
                    return;
                }

                $filtered = array_values(array_filter(
                    $modules,
                    fn (string $module) => $module !== 'survey',
                ));

                if ($filtered !== $modules) {
                    DB::table('clinics')
                        ->where('id', $clinic->id)
                        ->update(['enabled_modules' => json_encode($filtered)]);
                }
            });
    }

    public function down(): void
    {
        Schema::create('usability_surveys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('respondent_name')->nullable();
            $table->unsignedTinyInteger('q1');
            $table->unsignedTinyInteger('q2');
            $table->unsignedTinyInteger('q3');
            $table->unsignedTinyInteger('q4');
            $table->unsignedTinyInteger('q5');
            $table->unsignedTinyInteger('q6');
            $table->unsignedTinyInteger('q7');
            $table->unsignedTinyInteger('q8');
            $table->unsignedTinyInteger('q9');
            $table->unsignedTinyInteger('q10');
            $table->decimal('sus_score', 5, 2);
            $table->text('comments')->nullable();
            $table->timestamps();
        });
    }
};
