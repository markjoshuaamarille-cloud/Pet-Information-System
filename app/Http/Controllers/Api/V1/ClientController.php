<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ClientResource;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Clients
 *
 * Client (pet owner) management. Staff only.
 */
class ClientController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->success([
            'clients' => ClientResource::collection(
                Client::withCount('pets')->latest()->get()
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $client = Client::create($validated);

        return $this->created(['client' => new ClientResource($client)]);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $client->update($validated);

        return $this->success(['client' => new ClientResource($client)], 'Client updated successfully.');
    }

    public function destroy(Client $client): JsonResponse
    {
        $client->delete();

        return $this->deleted('Client removed successfully.');
    }
}
