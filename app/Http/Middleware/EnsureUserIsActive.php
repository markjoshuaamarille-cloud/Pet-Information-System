<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /** @var list<string> */
    private const EXCLUDED_ROUTE_NAMES = [
        'logout',
        'login',
        'register',
        'register-clinic-owner',
        'password.request',
        'password.email',
        'password.reset',
        'password.store',
        'verification.notice',
        'verification.verify',
        'verification.send',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isCustomer() || $user->is_active) {
            return $next($request);
        }

        $routeName = $request->route()?->getName() ?? '';

        if (in_array($routeName, self::EXCLUDED_ROUTE_NAMES, true)) {
            return $next($request);
        }

        auth()->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()
            ->route('login')
            ->with('status', 'Your account is pending approval. Please wait for an administrator to activate your account.');
    }
}
