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
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $user->isClinicOwner()) {
            return $next($request);
        }

        $module = ClinicModules::moduleForRoute($request->route()?->getName());

        if (! $module) {
            return $next($request);
        }

        $clinicId = $request->attributes->get('active_clinic_id');

        if (! $clinicId) {
            return redirect()
                ->route('clinic-registration.create')
                ->with('error', 'No clinic is assigned to your account.');
        }

        $clinic = Clinic::find($clinicId, ['id', 'enabled_modules']);

        if (! $clinic || ! ClinicModules::clinicHasModule($clinic->enabled_modules, $module)) {
            return redirect()
                ->route('dashboard')
                ->with('error', 'That module is not enabled for your clinic.');
        }

        return $next($request);
    }
}
