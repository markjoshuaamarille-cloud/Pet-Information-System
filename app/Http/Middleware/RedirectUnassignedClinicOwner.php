<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectUnassignedClinicOwner
{
    /** @var list<string> */
    private const ALLOWED_ROUTES = [
        'clinic-registration.create',
        'clinic-registration.store',
        'clinic-registration.geoapify-import',
        'profile.edit',
        'profile.update',
        'profile.destroy',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $user->requiresClinicRegistration()) {
            return $next($request);
        }

        $routeName = $request->route()?->getName();

        if ($routeName && in_array($routeName, self::ALLOWED_ROUTES, true)) {
            return $next($request);
        }

        return redirect()->route('clinic-registration.create');
    }
}
