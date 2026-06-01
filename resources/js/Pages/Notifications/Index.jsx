import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ListDisplayControls from '@/Components/ListDisplayControls';
import useListDisplayLimit from '@/hooks/useListDisplayLimit';
import { Head, Link } from '@inertiajs/react';

const severityStyle = {
    danger: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
};

const formatDate = (value) => {
    if (!value) {
        return null;
    }

    const iso = String(value);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleDateString();
};

const typeLabels = {
    appointment: 'Appointment',
    vaccine_due: 'Vaccine',
    vaccination_due: 'Vaccine Due',
    medication_due: 'Medication',
    consultation_due: 'Consultation',
    grooming_due: 'Grooming',
    surgery_due: 'Surgery',
    boarding_due: 'Boarding',
    emergency_care_due: 'Emergency',
};

export default function NotificationsIndex({ notifications, isCustomer = false }) {
    const {
        visibleItems: visibleNotifications,
        displayLimit,
        setDisplayLimit,
        totalCount: notificationListCount,
        showingCount: notificationShowingCount,
    } = useListDisplayLimit(notifications);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    {isCustomer ? 'Personal Notifications' : 'System Notifications'}
                </h2>
            }
        >
            <Head title={isCustomer ? 'Personal Notifications' : 'Notifications'} />
            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <p className="mb-4 text-sm text-gray-600">
                        {isCustomer
                            ? 'Reminders for your pets — upcoming appointments, vaccines, medications, and other due dates.'
                            : 'Alerts for stock levels, due vaccinations, and other workflow reminders.'}
                    </p>
                    {notifications.length === 0 ? (
                        <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow">
                            {isCustomer
                                ? 'No personal reminders at this time. Check back for appointment and health due date alerts.'
                                : 'No alerts at this time.'}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg bg-white shadow">
                            <ul className="divide-y divide-gray-200">
                            {visibleNotifications.map((n) => (
                                <li
                                    key={n.id ?? `${n.type}-${n.message}`}
                                    className={`p-4 ${severityStyle[n.severity] ?? severityStyle.info}`}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold uppercase">
                                            {(typeLabels[n.type] ?? n.type ?? 'alert').replace(/_/g, ' ')}
                                        </span>
                                        {n.due_date && (
                                            <span className="text-xs opacity-80">
                                                {formatDate(n.due_date)}
                                            </span>
                                        )}
                                    </div>
                                    {n.title && <p className="mt-1 font-semibold">{n.title}</p>}
                                    <p className="mt-1">{n.message}</p>
                                    {isCustomer && n.pet_id && (
                                        <Link
                                            href={route('pets.show', n.pet_id)}
                                            className="mt-2 inline-block text-sm font-medium underline"
                                        >
                                            View {n.pet_name ?? 'pet'} record
                                        </Link>
                                    )}
                                </li>
                            ))}
                            </ul>
                            <ListDisplayControls
                                totalCount={notificationListCount}
                                showingCount={notificationShowingCount}
                                displayLimit={displayLimit}
                                onLimitChange={setDisplayLimit}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
