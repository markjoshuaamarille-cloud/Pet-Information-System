<?php

namespace App\Http\Middleware;

use App\Support\ActiveClinicGuard;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveClinic
{
    /** @var list<string> */
    private const EXCLUDED_ROUTE_PREFIXES = [
        'admin.',
        'clinic-registration.',
        'profile.',
        'password.',
        'verification.',
    ];

    /** @var list<string> */
    private const EXCLUDED_ROUTE_NAMES = [
        'clinic-context.store',
        'logout',
        'login',
        'register',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        $routeName = $request->route()?->getName() ?? '';

        if ($this->isExcludedRoute($routeName)) {
            return $next($request);
        }

        foreach (ActiveClinicGuard::clinicIdsFromRequest($request) as $clinicId) {
            if (! ActiveClinicGuard::isOperational($clinicId)) {
                return ActiveClinicGuard::blockedResponse($request);
            }
        }

        return $next($request);
    }

    private function isExcludedRoute(string $routeName): bool
    {
        if (in_array($routeName, self::EXCLUDED_ROUTE_NAMES, true)) {
            return true;
        }

        foreach (self::EXCLUDED_ROUTE_PREFIXES as $prefix) {
            if (str_starts_with($routeName, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
