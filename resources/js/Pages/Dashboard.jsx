import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard({
    stats,
    expiredMedicines,
    criticalMedicines,
    expiringSoon,
    upcomingAppointments,
    dueHealthRecords,
}) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Pet Care Management Dashboard</h2>}>
            <Head title="Dashboard" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Pets', value: stats.pets },
                            { label: 'Clients', value: stats.clients },
                            { label: 'Appointments Today', value: stats.appointments_today },
                            { label: 'Medicines', value: stats.medicines },
                        ].map((s) => (
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
                            <h3 className="mb-3 font-semibold">Upcoming Appointments</h3>
                            {upcomingAppointments.length === 0 ? (
                                <p className="text-sm text-gray-500">No upcoming appointments.</p>
                            ) : (
                                <ul className="space-y-2 text-sm">
                                    {upcomingAppointments.map((a) => (
                                        <li key={a.id} className="border-b pb-2">
                                            <strong>{a.pet?.pet_name}</strong> — {a.type} with {a.client?.name}
                                            <br />
                                            <span className="text-gray-500">{new Date(a.scheduled_at).toLocaleString()}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="rounded-lg bg-white p-5 shadow">
                            <h3 className="mb-3 font-semibold">Health Monitoring (Due Soon)</h3>
                            {dueHealthRecords.length === 0 ? (
                                <p className="text-sm text-gray-500">No upcoming due dates.</p>
                            ) : (
                                <ul className="space-y-2 text-sm">
                                    {dueHealthRecords.map((r) => (
                                        <li key={r.id} className="border-b pb-2">
                                            {r.pet?.pet_name} — {r.type}: {r.title}
                                            <br />
                                            <span className="text-gray-500">Due: {r.next_due_date}</span>
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
