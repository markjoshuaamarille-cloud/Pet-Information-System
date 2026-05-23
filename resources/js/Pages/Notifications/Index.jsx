import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

const severityStyle = {
    danger: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export default function NotificationsIndex({ notifications }) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">System Notifications</h2>}>
            <Head title="Notifications" />
            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <p className="mb-4 text-sm text-gray-600">Alerts for stock levels, due vaccinations, and other workflow reminders.</p>
                    {notifications.length === 0 ? (
                        <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow">No alerts at this time.</div>
                    ) : (
                        <ul className="space-y-3">
                            {notifications.map((n, i) => (
                                <li key={i} className={`rounded-lg border p-4 ${severityStyle[n.severity]}`}>
                                    <span className="text-xs font-bold uppercase">{n.type.replace('_', ' ')}</span>
                                    {n.title && <p className="mt-1 font-semibold">{n.title}</p>}
                                    <p className="mt-1">{n.message}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
