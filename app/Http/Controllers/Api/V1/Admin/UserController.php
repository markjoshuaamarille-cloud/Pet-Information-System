<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Controller;
use App\Http\Resources\UserResource;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * @group Admin Users
 */
class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->success([
            'users' => UserResource::collection(User::orderBy('name')->get(['id', 'name', 'email', 'role', 'created_at'])),
            'roles' => $this->roles(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::in($this->roles())],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $clientId = null;
        if ($validated['role'] === 'customer') {
            $client = Client::firstOrCreate(
                ['email' => $validated['email']],
                ['name' => $validated['name'], 'contact' => 'N/A', 'address' => null]
            );
            $clientId = $client->id;
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'client_id' => $clientId,
            'password' => Hash::make($validated['password']),
        ]);

        return $this->created(['user' => new UserResource($user)]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in($this->roles())],
        ]);

        $updates = ['role' => $validated['role']];

        if ($validated['role'] === 'customer' && ! $user->client_id) {
            $client = Client::firstOrCreate(
                ['email' => $user->email],
                ['name' => $user->name, 'contact' => 'N/A', 'address' => null]
            );
            $updates['client_id'] = $client->id;
        }

        if ($validated['role'] !== 'customer') {
            $updates['client_id'] = null;
        }

        $user->update($updates);

        return $this->success(['user' => new UserResource($user->fresh())], 'User role updated.');
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()?->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own admin account.'], 422);
        }

        $user->delete();

        return $this->deleted('User deleted successfully.');
    }

    /**
     * @return list<string>
     */
    private function roles(): array
    {
        return ['super_admin', 'veterinarian', 'receptionist', 'groomer', 'customer', 'cashier'];
    }
}
