<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $client = Client::firstOrCreate(
            ['email' => $request->email],
            [
                'name' => $request->name,
                'contact' => 'N/A',
                'address' => null,
            ]
        );

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'role' => 'customer',
            'client_id' => $client->id,
            'password' => Hash::make($request->password),
        ]);

        event(new Registered($user));

        Auth::login($user);

        $request->session()->regenerate();

        $dashboardUrl = route('dashboard', absolute: false);

        if ($request->header('X-Inertia')) {
            return Inertia::location($dashboardUrl);
        }

        return redirect($dashboardUrl);
    }
}
