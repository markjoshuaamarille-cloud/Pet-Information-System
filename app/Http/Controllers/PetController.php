<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Medicine;
use App\Models\Pet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PetController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Pets/Index', [
            'pets' => Pet::with('client')->latest()->get(),
            'clients' => Client::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'pet_name' => 'required|string|max:255',
            'species' => 'required|string|max:255',
            'breed' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:0|max:150',
            'gender' => 'nullable|string|max:50',
            'medical_history' => 'nullable|string',
        ]);

        Pet::create($validated);

        return redirect()->back()->with('success', 'Pet record created successfully.');
    }

    public function show(Pet $pet): Response
    {
        $pet->load(['client', 'healthRecords.medicine', 'appointments']);

        return Inertia::render('Pets/Show', [
            'pet' => $pet,
            'medicines' => Medicine::whereIn('category', ['medicine', 'supplement_vitamin'])
                ->where('quantity', '>', 0)
                ->orderBy('name')
                ->get(['id', 'name', 'category', 'quantity']),
        ]);
    }

    public function update(Request $request, Pet $pet): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'pet_name' => 'required|string|max:255',
            'species' => 'required|string|max:255',
            'breed' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:0|max:150',
            'gender' => 'nullable|string|max:50',
            'medical_history' => 'nullable|string',
        ]);

        $pet->update($validated);

        return redirect()->back()->with('success', 'Pet record updated successfully.');
    }

    public function destroy(Pet $pet): RedirectResponse
    {
        $pet->delete();

        return redirect()->route('pets.index')->with('success', 'Pet record deleted successfully.');
    }

    public function clientRecord(Pet $pet): Response
    {
        $pet->load(['client', 'healthRecords.medicine']);

        return Inertia::render('Pets/ClientRecord', [
            'pet' => $pet,
        ]);
    }
}
