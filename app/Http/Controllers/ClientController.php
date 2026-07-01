<?php



namespace App\Http\Controllers;



use App\Models\Client;

use App\Models\Pet;

use Illuminate\Http\JsonResponse;

use Illuminate\Http\RedirectResponse;

use Illuminate\Http\Request;

use Illuminate\Support\Collection;

use Inertia\Inertia;

use Inertia\Response;



class ClientController extends Controller

{

    public function index(): Response

    {

        return Inertia::render('Clients/Index', [

            'clients' => $this->serializedClients(),

        ]);

    }



    public function pets(Client $client): JsonResponse

    {

        return response()->json([

            'pets' => $this->serializePets(

                Pet::query()

                    ->where('client_id', $client->id)

                    ->orderBy('pet_name')

                    ->get(['id', 'pet_name', 'species', 'breed', 'is_active']),

            ),

        ]);

    }



    public function store(Request $request): RedirectResponse

    {

        $validated = $request->validate([

            'name' => 'required|string|max:255',

            'contact' => 'required|string|max:255',

            'email' => 'nullable|email|max:255',

            'address' => 'nullable|string',

        ]);



        Client::create($validated);



        return redirect()->back()->with('success', 'Client registered successfully.');

    }



    public function update(Request $request, Client $client): RedirectResponse

    {

        $validated = $request->validate([

            'name' => 'required|string|max:255',

            'contact' => 'required|string|max:255',

            'email' => 'nullable|email|max:255',

            'address' => 'nullable|string',

        ]);



        $client->update($validated);



        return redirect()->back()->with('success', 'Client updated successfully.');

    }



    public function destroy(Client $client): RedirectResponse

    {

        $client->delete();



        return redirect()->back()->with('success', 'Client removed successfully.');

    }



    /**

     * @return list<array<string, mixed>>

     */

    private function serializedClients(): array

    {

        $clients = Client::query()

            ->withCount('pets')

            ->latest()

            ->get();



        if ($clients->isEmpty()) {

            return [];

        }



        $petsByClient = Pet::query()

            ->whereIn('client_id', $clients->pluck('id'))

            ->orderBy('pet_name')

            ->get(['id', 'client_id', 'pet_name', 'species', 'breed', 'is_active'])

            ->groupBy('client_id');



        return $clients

            ->map(function (Client $client) use ($petsByClient) {

                $pets = $petsByClient->get($client->id, collect());



                return [

                    'id' => $client->id,

                    'name' => $client->name,

                    'contact' => $client->contact,

                    'email' => $client->email,

                    'address' => $client->address,

                    'pets_count' => (int) $client->pets_count,

                    'pets' => $this->serializePets($pets),

                ];

            })

            ->values()

            ->all();

    }



    /**

     * @param  Collection<int, Pet>  $pets

     * @return list<array<string, mixed>>

     */

    private function serializePets(Collection $pets): array

    {

        return $pets

            ->map(fn (Pet $pet) => [

                'id' => $pet->id,

                'pet_name' => $pet->pet_name,

                'species' => $pet->species,

                'breed' => $pet->breed,

                'is_active' => (bool) $pet->is_active,

            ])

            ->values()

            ->all();

    }

}


