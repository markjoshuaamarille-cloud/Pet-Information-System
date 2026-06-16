<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredClinicOwnerController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/RegisterClinicOwner');
    }

    /**
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'contact'  => ['required', 'string', 'max:100'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'contact'   => $validated['contact'],
            'role'      => 'clinic_owner',
            'is_active' => false,
            'password'  => Hash::make($validated['password']),
        ]);

        event(new Registered($user));

        return redirect()
            ->route('login')
            ->with('status', 'Registration submitted! An administrator will review your account and contact you at '.$validated['contact'].' or '.$validated['email'].' for approval.');
    }
}
