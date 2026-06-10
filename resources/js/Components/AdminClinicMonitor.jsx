import { router, usePage } from '@inertiajs/react';

/**
 * Super-admin-only clinic scope switcher shown on every authenticated page.
 * Uses session-based clinic context (POST clinic-context.store).
 */
export default function AdminClinicMonitor() {
    const {
        activeClinic,
        assignedClinics = [],
        isPlatformAdmin,
        monitoringAllClinics,
    } = usePage().props;

    if (!isPlatformAdmin) {
        return null;
    }

    const switchClinic = (clinicId) => {
        router.post(
            route('clinic-context.store'),
            { clinic_id: clinicId || null },
            { preserveScroll: true },
        );
    };

    return (
        <div className="border-b border-indigo-200 bg-indigo-50">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
                        Super Admin — Clinic Monitor
                    </p>
                    <p className="mt-0.5 text-sm text-indigo-900">
                        {monitoringAllClinics ? (
                            <>
                                Viewing records across{' '}
                                <span className="font-medium">all registered clinics</span>.
                                Pick a clinic below to filter modules and perform
                                actions in that clinic&apos;s context.
                            </>
                        ) : (
                            <>
                                Monitoring{' '}
                                <span className="font-medium">
                                    {activeClinic?.name ?? 'selected clinic'}
                                </span>
                                . Lists, reports, and actions apply to this clinic
                                only.
                            </>
                        )}
                    </p>
                </div>

                <div className="flex shrink-0 flex-col gap-1 sm:items-end">
                    <label
                        htmlFor="admin-clinic-monitor"
                        className="text-xs font-medium text-indigo-800"
                    >
                        Registered clinic
                    </label>
                    <select
                        id="admin-clinic-monitor"
                        className="min-w-[14rem] rounded-md border-indigo-200 bg-white py-2 pe-8 ps-3 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={activeClinic?.id ?? ''}
                        onChange={(e) => switchClinic(e.target.value)}
                    >
                        <option value="">All registered clinics</option>
                        {assignedClinics.map((clinic) => (
                            <option key={clinic.id} value={clinic.id}>
                                {clinic.name}
                                {clinic.status && clinic.status !== 'active'
                                    ? ` (${clinic.status})`
                                    : ''}
                            </option>
                        ))}
                    </select>
                    {activeClinic?.status === 'inactive' && (
                        <p className="max-w-xs text-right text-xs text-amber-800">
                            This clinic is deactivated. Viewing only — no new activity allowed.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
