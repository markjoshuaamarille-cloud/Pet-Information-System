<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use Illuminate\Database\Seeder;

class PetCareSeeder extends Seeder
{
    public function run(): void
    {
        $client = Client::create([
            'name' => 'Maria Santos',
            'contact' => '09171234567',
            'email' => 'maria@example.com',
            'address' => '123 Main St, Manila',
        ]);

        $pet = Pet::create([
            'client_id' => $client->id,
            'pet_name' => 'Buddy',
            'species' => 'Dog',
            'breed' => 'Labrador',
            'age' => 3,
            'gender' => 'Male',
            'medical_history' => 'No known allergies.',
        ]);

        $medicine = Medicine::create([
            'name' => 'Amoxicillin',
            'description' => 'Antibiotic for infections',
            'quantity' => 5,
            'unit' => 'bottles',
            'expiry_date' => now()->addMonths(6),
            'reorder_level' => 10,
        ]);

        Medicine::create([
            'name' => 'Rabies Vaccine',
            'description' => 'Annual rabies vaccination',
            'quantity' => 2,
            'unit' => 'vials',
            'expiry_date' => now()->subMonth(),
            'reorder_level' => 5,
        ]);

        HealthRecord::create([
            'pet_id' => $pet->id,
            'type' => 'vaccination',
            'title' => 'Anti-rabies vaccine',
            'record_date' => now()->subMonths(11),
            'next_due_date' => now()->addMonth(),
            'veterinarian_notes' => 'Annual booster due soon.',
        ]);

        HealthRecord::create([
            'pet_id' => $pet->id,
            'medicine_id' => $medicine->id,
            'type' => 'medication',
            'title' => 'Skin infection treatment',
            'dosage' => '250mg twice daily',
            'record_date' => now()->subWeek(),
            'veterinarian_notes' => 'Complete full course.',
        ]);

        Appointment::create([
            'pet_id' => $pet->id,
            'client_id' => $client->id,
            'scheduled_at' => now()->addDays(3),
            'type' => 'checkup',
            'status' => 'scheduled',
            'notes' => 'Routine wellness check',
        ]);
    }
}
