<?php

use App\Models\Client;
use App\Models\Pet;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        Pet::query()->each(function (Pet $pet) {
            if ($pet->client_id) {
                return;
            }

            $client = Client::create([
                'name' => $pet->owner_name ?? 'Unknown Owner',
                'contact' => $pet->owner_contact ?? 'N/A',
                'address' => $pet->owner_address,
            ]);

            $pet->update(['client_id' => $client->id]);
        });

        Schema::table('pets', function (Blueprint $table) {
            $table->dropColumn(['owner_name', 'owner_contact', 'owner_address']);
        });
    }

    public function down(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->string('owner_name')->nullable();
            $table->string('owner_contact')->nullable();
            $table->string('owner_address')->nullable();
        });

        Pet::with('client')->each(function (Pet $pet) {
            if ($pet->client) {
                $pet->update([
                    'owner_name' => $pet->client->name,
                    'owner_contact' => $pet->client->contact,
                    'owner_address' => $pet->client->address,
                ]);
            }
        });

        Schema::table('pets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('client_id');
        });
    }
};
