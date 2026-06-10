<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use App\Models\User;
use App\Support\CustomerAlerts;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'appTimezone' => config('app.timezone'),
            'customerAlerts' => function () use ($request): ?array {
                $user = $request->user();

                if (! $user instanceof User || ! $user->isCustomer() || ! $user->client_id) {
                    return null;
                }

                return CustomerAlerts::forClient((int) $user->client_id);
            },
            'activeClinic' => function () use ($request): ?array {
                $user = $request->user();

                if (! $user instanceof User) {
                    return null;
                }

                $clinicId = $request->attributes->get('active_clinic_id');

                if (! $clinicId) {
                    return null;
                }

                $clinic = Clinic::find($clinicId, ['id', 'name', 'slug', 'status', 'enabled_modules',
                    'has_veterinary', 'has_pet_shop', 'has_grooming']);

                return $clinic?->toArray();
            },
            'assignedClinics' => function () use ($request): array {
                $user = $request->user();

                if (! $user instanceof User) {
                    return [];
                }

                if ($user->isPlatformAdmin()) {
                    return Clinic::query()
                        ->whereIn('status', ['active', 'pending', 'inactive'])
                        ->orderByRaw("FIELD(status, 'active', 'pending', 'inactive')")
                        ->orderBy('name')
                        ->get(['id', 'name', 'slug', 'status'])
                        ->toArray();
                }

                return $user->clinics()
                    ->where('clinics.status', 'active')
                    ->get(['clinics.id', 'clinics.name', 'clinics.slug'])
                    ->toArray();
            },
            'isPlatformAdmin' => fn () => $request->user()?->isPlatformAdmin() ?? false,
            'monitoringAllClinics' => function () use ($request): bool {
                $user = $request->user();

                return $user instanceof User
                    && $user->isPlatformAdmin()
                    && ! $request->attributes->get('active_clinic_id');
            },
            'hasDeactivatedClinicOnly' => fn () => $request->user()?->hasDeactivatedClinicOnly() ?? false,
        ];
    }
}
