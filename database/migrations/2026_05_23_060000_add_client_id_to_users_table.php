<?php

use App\Models\Client;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('role')->constrained('clients')->nullOnDelete();
        });

        $customers = DB::table('users')
            ->where('role', 'customer')
            ->whereNull('client_id')
            ->get(['id', 'name', 'email']);

        foreach ($customers as $customer) {
            $client = Client::firstOrCreate(
                ['email' => $customer->email],
                [
                    'name' => $customer->name,
                    'contact' => 'N/A',
                    'address' => null,
                ]
            );

            DB::table('users')
                ->where('id', $customer->id)
                ->update(['client_id' => $client->id]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('client_id');
        });
    }
};
