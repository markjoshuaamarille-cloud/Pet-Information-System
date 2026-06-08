<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\User;
use App\Support\GeoapifyAddress;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user   = $request->user();
        $client = ($user instanceof User && $user->isCustomer()) ? $user->client : null;

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status'          => session('status'),
            'clientLocation'  => $client ? [
                'address'           => $client->address,
                'address_line1'     => $client->address_line1,
                'address_line2'     => $client->address_line2,
                'barangay'          => $client->barangay,
                'city'              => $client->city,
                'province'          => $client->province,
                'postal_code'       => $client->postal_code,
                'country'           => $client->country,
                'latitude'          => $client->latitude,
                'longitude'         => $client->longitude,
                'address_formatted' => $client->address_formatted,
            ] : null,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        $user = $request->user();

        if ($user instanceof User && $user->isCustomer() && $user->client_id && $request->filled('address_line1')) {
            $locationValidated = $request->validate(GeoapifyAddress::validationRules(requireCoordinates: true));
            $user->client()->update(GeoapifyAddress::normalizeClientFields($locationValidated));
        }

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
