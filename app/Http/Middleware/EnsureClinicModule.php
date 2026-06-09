<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use App\Models\User;
use App\Support\ClinicModules;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureClinicModule
{
    /** @var list<string> */
    private const ALLOWED_WITHOUT_ACTIVE_CLINIC = [
        'dashboard',
        'profile.edit',
        'profile.update',
        'profile.destroy',
        'logout',
        'verification.notice',
        'verification.verify',
        'verification.send',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            return $next($request);
        }

        if ($user->isPlatformAdmin() || $user->isCustomer()) {
            return $next($request);
        }

        $routeName = $request->route()?->getName() ?? '';

        if ($user->isClinicOwner() && ! $user->clinics()->exists()) {
            return $next($request);
        }

        if (! $user->isClinicAssignedStaff()) {
            return $next($request);
        }

        if ($this->isAllowedWithoutActiveClinic($routeName)) {
            return $next($request);
        }

        if ($user->hasDeactivatedClinicOnly()) {
            return redirect()
                ->route('dashboard')
                ->with('error', 'Your assigned clinic has been deactivated. Contact the platform administrator.');
        }

        $clinicId = $request->attributes->get('active_clinic_id');

        if (! $clinicId) {
            return redirect()
                ->route('dashboard')
                ->with('error', 'No active clinic is available for your account.');
        }

        $clinic = Clinic::find($clinicId, ['id', 'status', 'enabled_modules']);

        if (! $clinic || ! $clinic->isOperational()) {
            return redirect()
                ->route('dashboard')
                ->with('error', 'Your clinic is deactivated. Contact the platform administrator.');
        }

        $module = ClinicModules::moduleForRoute($routeName);

        if ($module && ! ClinicModules::clinicHasModule($clinic->enabled_modules, $module)) {
            return redirect()
                ->route('dashboard')
                ->with('error', 'That module is not enabled for your clinic.');
        }

        return $next($request);
    }

    private function isAllowedWithoutActiveClinic(string $routeName): bool
    {
        return in_array($routeName, self::ALLOWED_WITHOUT_ACTIVE_CLINIC, true);
    }
}
