import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import { Head, Link, router, usePage } from '@inertiajs/react';

const formatDate = (value) => {
    if (!value) {
        return '—';
    }

    const iso = String(value);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleDateString();
};

const categoryStyles = {
    vaccine: 'bg-sky-100 text-sky-800',
    vaccination: 'bg-blue-100 text-blue-800',
    medication: 'bg-purple-100 text-purple-800',
    consultation: 'bg-gray-100 text-gray-800',
    grooming: 'bg-emerald-100 text-emerald-800',
    surgery: 'bg-rose-100 text-rose-800',
    boarding: 'bg-amber-100 text-amber-800',
    emergency_care: 'bg-red-100 text-red-800',
};

const serviceLabels = {
    checkup: 'Checkup',
    vaccination: 'Vaccination',
    grooming: 'Grooming',
    consultation: 'Consultation',
    surgery: 'Surgery',
    boarding: 'Boarding / Hotel',
    emergency_care: 'Emergency Care',
    other: 'Other',
};

export default function Dashboard({
    stats,
    expiredMedicines,
    criticalMedicines,
    expiringSoon,
    upcomingAppointments,
    dueHealthRecords,
    appointmentsSectionTitle = 'Upcoming Appointments',
    appointmentsStatLabel = 'Appointments Today & Recent',
    canManageAppointmentStatus = false,
}) {
    const isCustomer = usePage().props.auth.user?.role === 'customer';

    const statCards = [
        { label: 'Pets', value: stats.pets },
        ...(isCustomer
            ? []
            : [{ label: 'Clients', value: stats.clients }]),
        { label: appointmentsStatLabel, value: stats.appointments_today },
        ...(isCustomer
            ? []
            : [{ label: 'Medicines', value: stats.medicines }]),
    ];

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Pet Care Management Dashboard</h2>}>
            <Head title="Dashboard" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <div className={`grid gap-4 sm:grid-cols-2 ${isCustomer ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
                        {statCards.map((s) => (
                            <div key={s.label} className="rounded-lg bg-white p-5 shadow">
                                <p className="text-sm text-gray-500">{s.label}</p>
                                <p className="text-3xl font-bold text-indigo-600">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {(expiredMedicines.length > 0 || criticalMedicines.length > 0) && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                            <h3 className="font-semibold text-red-800">Stock Alerts</h3>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                                {expiredMedicines.map((m) => (
                                    <li key={`exp-${m.id}`}>{m.name} — expired ({m.expiry_date})</li>
                                ))}
                                {criticalMedicines.map((m) => (
                                    <li key={`crit-${m.id}`}>{m.name} — critical stock ({m.quantity} {m.unit})</li>
                                ))}
                            </ul>
                            <Link href={route('notifications.index')} className="mt-2 inline-block text-sm font-medium text-red-800 underline">
                                View all notifications
                            </Link>
                        </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-lg bg-white p-5 shadow">
                            <h3 className="mb-3 font-semibold">{appointmentsSectionTitle}</h3>
                            {upcomingAppointments.length === 0 ? (
                                <p className="text-sm text-gray-500">No upcoming appointments.</p>
                            ) : (
                                <ul className="space-y-2 text-sm">
                                    {upcomingAppointments.map((a) => (
                                        <li key={a.id} className="border-b pb-2">
                                            <strong>{a.pet?.pet_name}</strong> — {serviceLabels[a.type] ?? a.type} with {a.client?.name}
                                            <br />
                                            <span className="text-gray-500">{new Date(a.scheduled_at).toLocaleString()}</span>
                                            <span className="ml-2 text-xs font-medium uppercase text-gray-600">[{a.status}]</span>
                                            {canManageAppointmentStatus && a.status !== 'completed' && (
                                                <button
                                                    type="button"
                                                    className="ml-3 text-xs font-medium text-emerald-700 hover:underline"
                                                    onClick={() => router.put(route('appointments.update', a.id), {
                                                        pet_id: a.pet_id,
                                                        client_id: a.client_id,
                                                        scheduled_at: a.scheduled_at,
                                                        type: a.type,
                                                        status: 'completed',
                                                        notes: a.notes ?? '',
                                                    })}
                                                >
                                                    Mark completed
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="rounded-lg bg-white p-5 shadow">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold">Health Monitoring (Due Soon)</h3>
                                    <p className="text-xs text-gray-500">
                                        Vaccines, medications, and follow-ups within 30 days
                                    </p>
                                </div>
                                <Link
                                    href={route('notifications.index')}
                                    className="text-xs font-medium text-indigo-600 hover:underline"
                                >
                                    All alerts
                                </Link>
                            </div>
                            {dueHealthRecords.length === 0 ? (
                                <p className="text-sm text-gray-500">No upcoming due dates.</p>
                            ) : (
                                <ul className="space-y-3 text-sm">
                                    {dueHealthRecords.map((event) => (
                                        <li key={event.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                                                        categoryStyles[event.category] ?? 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {event.category_label}
                                                </span>
                                                {event.is_overdue && (
                                                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                                        Overdue
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1">
                                                {event.pet_id ? (
                                                    <Link
                                                        href={route('pets.show', event.pet_id)}
                                                        className="font-medium text-indigo-600 hover:underline"
                                                    >
                                                        {event.pet_name ?? 'Unknown pet'}
                                                    </Link>
                                                ) : (
                                                    <strong>{event.pet_name ?? 'Unknown pet'}</strong>
                                                )}
                                                {' — '}
                                                {event.title}
                                                {event.detail && (
                                                    <span className="text-gray-600"> ({event.detail})</span>
                                                )}
                                            </p>
                                            <p className="text-gray-500">
                                                Due: {formatDate(event.due_date)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {expiringSoon.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <strong>Expiring within 30 days:</strong>{' '}
                            {expiringSoon.map((m) => m.name).join(', ')}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
