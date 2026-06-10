<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Auth\LoginRequest;
use App\Models\Client;
use App\Models\User;
use App\Support\GeoapifyAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

/**
 * @group Authentication
 *
 * Token-based authentication for the Pet Information System mobile API.
 */
class AuthController extends Controller
{
    /**
     * Login
     *
     * Authenticate with email and password. Returns a Bearer token.
     *
     * @unauthenticated
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $request->authenticate();

        $user = $request->user();
        $token = $user->createToken('mobile-app')->plainTextToken;

        return $this->success([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->userPayload($user),
        ], 'Login successful.');
    }

    /**
     * Register
     *
     * Create a customer account and return a Bearer token.
     *
     * @unauthenticated
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ...GeoapifyAddress::validationRules(requireCoordinates: true),
        ]);

        $location = GeoapifyAddress::normalizeClientFields($validated);

        $client = Client::firstOrCreate(
            ['email' => $validated['email']],
            [
                'name' => $validated['name'],
                'contact' => 'N/A',
                ...$location,
            ]
        );

        if (! $client->wasRecentlyCreated) {
            $client->update([
                'name' => $validated['name'],
                ...$location,
            ]);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => 'customer',
            'client_id' => $client->id,
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('mobile-app')->plainTextToken;

        return $this->created([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->userPayload($user),
        ], 'Registration successful.');
    }

    /**
     * Current user
     *
     * Get the authenticated user's profile.
     */
    public function user(Request $request): JsonResponse
    {
        return $this->success([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    /**
     * Logout
     *
     * Revoke the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->success(null, 'Logged out successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'client_id' => $user->client_id,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
        ];
    }
}
