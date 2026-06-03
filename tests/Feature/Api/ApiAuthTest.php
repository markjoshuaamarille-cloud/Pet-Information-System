<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_via_api(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Mobile User',
            'email' => 'mobile@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'message',
                'data' => ['token', 'token_type', 'user' => ['id', 'email', 'role']],
            ]);

        $this->assertDatabaseHas('users', ['email' => 'mobile@example.com', 'role' => 'customer']);
    }

    public function test_user_can_login_and_access_dashboard(): void
    {
        $user = User::factory()->create([
            'email' => 'staff@example.com',
            'password' => bcrypt('password'),
            'role' => 'receptionist',
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'staff@example.com',
            'password' => 'password',
        ]);

        $login->assertOk()->assertJsonPath('data.token_type', 'Bearer');
        $token = $login->json('data.token');

        $this->getJson('/api/v1/dashboard', [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()->assertJsonStructure(['message', 'data' => ['stats']]);
    }

    public function test_customer_cannot_access_admin_users(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $token = $user->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/users', [
            'Authorization' => 'Bearer '.$token,
        ])->assertForbidden();
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/v1/pets')->assertUnauthorized();
    }
}
