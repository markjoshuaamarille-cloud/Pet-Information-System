import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { formatClinicDate, formatClinicDateTime } from '@/utils/formatDateTime';

const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

function StatCard({ label, value, accent = 'indigo' }) {
    const accents = {
        indigo: 'border-indigo-100 bg-indigo-50 text-indigo-900',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-900',
        amber: 'border-amber-100 bg-amber-50 text-amber-900',
        rose: 'border-rose-100 bg-rose-50 text-rose-900',
        slate: 'border-slate-200 bg-slate-50 text-slate-900',
    };

    return (
        <div className={`rounded-xl border p-4 shadow-sm ${accents[accent] ?? accents.indigo}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
    );
}

function StatusBadge({ status, type = 'appointment' }) {
    const appointmentStyles = {
        scheduled: 'bg-blue-100 text-blue-800',
        completed: 'bg-emerald-100 text-emerald-800',
        cancelled: 'bg-gray-200 text-gray-800',
    };

    const billingStyles = {
        unpaid: 'bg-amber-100 text-amber-800',
        partial: 'bg-orange-100 text-orange-800',
        paid: 'bg-emerald-100 text-emerald-800',
        cancelled: 'bg-gray-200 text-gray-700',
    };

    const styles = type === 'billing' ? billingStyles : appointmentStyles;
    const label = status ? String(status).replace(/_/g, ' ') : '—';

    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}
        >
            {label}
        </span>
    );
}

function CancellationBadge({ reason }) {
    if (!reason) {
        return null;
    }

    const styles = {
        no_show: 'bg-amber-100 text-amber-900',
        self_cancelled: 'bg-rose-100 text-rose-900',
        staff_cancelled: 'bg-purple-100 text-purple-900',
        manual: 'bg-gray-200 text-gray-800',
    };

    const labels = {
        no_show: 'No-show (system)',
        self_cancelled: 'Self-cancelled (customer)',
        staff_cancelled: 'Cancelled by staff',
        manual: 'Other / legacy',
    };

    return (
        <span
            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[reason] ?? styles.manual}`}
        >
            {labels[reason] ?? reason}
        </span>
    );
}

function PaginationLinks({ paginator, filters }) {
    if (!paginator?.links?.length) {
        return null;
    }

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600">
                Showing {paginator.from ?? 0}–{paginator.to ?? 0} of {paginator.total ?? 0}
            </p>
            <div className="flex flex-wrap gap-1">
                {paginator.links.map((link, index) => {
                    if (!link.url) {
                        return (
                            <span
                                key={index}
                                className="rounded-md px-3 py-1.5 text-sm text-gray-400"
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        );
                    }

                    return (
                        <Link
                            key={index}
                            href={link.url}
                            preserveScroll
                            className={`rounded-md px-3 py-1.5 text-sm ${
                                link.active
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default function Index({
    summary,
    appointments,
    transactions,
    filters,
    clinics,
    periods,
    businessLines,
    appointmentStatuses,
    cancellationTypes,
    billingStatuses,
    saleTypes,
    appointmentTypes,
}) {
    const { appTimezone } = usePage().props;
    const activeView = filters.view ?? 'appointments';

    const [view, setView] = useState(activeView);
    const [period, setPeriod] = useState(filters.period ?? 'weekly');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [clinicId, setClinicId] = useState(filters.clinic_id ? String(filters.clinic_id) : '');
    const [businessLine, setBusinessLine] = useState(filters.business_line ?? '');
    const [appointmentStatus, setAppointmentStatus] = useState(filters.appointment_status ?? '');
    const [cancellationType, setCancellationType] = useState(filters.cancellation_type ?? '');
    const [billingStatus, setBillingStatus] = useState(filters.billing_status ?? '');
    const [saleType, setSaleType] = useState(filters.sale_type ?? '');
    const [appointmentType, setAppointmentType] = useState(filters.appointment_type ?? '');
    const [search, setSearch] = useState(filters.search ?? '');
    const [dateFilterError, setDateFilterError] = useState('');

    const hasCustomRange = Boolean(dateFrom || dateTo);

    const buildParams = (overrides = {}) => {
        const params = {
            view: overrides.view ?? view,
            clinic_id: clinicId || undefined,
            business_line: businessLine || undefined,
            search: search.trim() || undefined,
            ...(overrides.view ?? view) === 'appointments'
                ? {
                      appointment_status: appointmentStatus || undefined,
                      cancellation_type: cancellationType || undefined,
                      appointment_type: appointmentType || undefined,
                  }
                : {
                      billing_status: billingStatus || undefined,
                      sale_type: saleType || undefined,
                  },
        };

        const df = overrides.df ?? dateFrom;
        const dt = overrides.dt ?? dateTo;

        if (df || dt) {
            if (df) {
                params.date_from = df;
            }
            if (dt) {
                params.date_to = dt;
            }
        } else {
            params.period = overrides.period ?? period;
        }

        return params;
    };

    const applyFilters = () => {
        if (dateFrom && dateTo && dateFrom > dateTo) {
            setDateFilterError('The From date must be on or before the To date.');
            return;
        }

        setDateFilterError('');
        router.get(route('admin.platform-activity.index'), buildParams(), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const switchView = (nextView) => {
        setView(nextView);
        router.get(
            route('admin.platform-activity.index'),
            buildParams({ view: nextView }),
            { preserveScroll: true, preserveState: true },
        );
    };

    const changePeriod = (nextPeriod) => {
        setPeriod(nextPeriod);
        setDateFrom('');
        setDateTo('');
        setDateFilterError('');
        router.get(
            route('admin.platform-activity.index'),
            buildParams({ period: nextPeriod, df: '', dt: '' }),
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Platform Activity
                </h2>
            }
        >
            <Head title="Platform Activity" />

            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
                        <h3 className="text-base font-semibold text-indigo-950">
                            Cross-clinic activity monitor
                        </h3>
                        <p className="mt-1 text-sm text-indigo-900/80">
                            Read-only view of every appointment and billing transaction across
                            all registered clinics — veterinary, pet shop, and grooming — including
                            completed, self-cancelled by customers, staff-cancelled, and system
                            no-show cancellations.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                        <StatCard label="Appointments" value={summary.appointments_total} />
                        <StatCard
                            label="Scheduled"
                            value={summary.appointments_scheduled}
                            accent="indigo"
                        />
                        <StatCard
                            label="Completed"
                            value={summary.appointments_completed}
                            accent="emerald"
                        />
                        <StatCard
                            label="Cancelled"
                            value={summary.appointments_cancelled}
                            accent="rose"
                        />
                        <StatCard
                            label="No-show (system)"
                            value={summary.appointments_no_show}
                            accent="amber"
                        />
                        <StatCard
                            label="Self-cancelled"
                            value={summary.appointments_self_cancelled}
                            accent="rose"
                        />
                        <StatCard
                            label="Billings total"
                            value={formatPeso(summary.billings_total_amount)}
                            accent="slate"
                        />
                    </div>

                    <div className="flex gap-2 border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => switchView('appointments')}
                            className={`border-b-2 px-4 py-2 text-sm font-medium ${
                                activeView === 'appointments'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Appointments
                        </button>
                        <button
                            type="button"
                            onClick={() => switchView('transactions')}
                            className={`border-b-2 px-4 py-2 text-sm font-medium ${
                                activeView === 'transactions'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Transactions / Billings
                        </button>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                            <div className="flex flex-wrap gap-2">
                                {periods.map((item) => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => changePeriod(item.value)}
                                        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                                            period === item.value && !hasCustomRange
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form
                            className="mt-4 space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                applyFilters();
                            }}
                        >
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <InputLabel value="From" />
                                    <TextInput
                                        type="date"
                                        className="mt-1 block w-full"
                                        value={dateFrom}
                                        max={dateTo || undefined}
                                        onChange={(e) => {
                                            setDateFrom(e.target.value);
                                            setDateFilterError('');
                                        }}
                                    />
                                </div>
                                <div>
                                    <InputLabel value="To" />
                                    <TextInput
                                        type="date"
                                        className="mt-1 block w-full"
                                        value={dateTo}
                                        min={dateFrom || undefined}
                                        onChange={(e) => {
                                            setDateTo(e.target.value);
                                            setDateFilterError('');
                                        }}
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Clinic" />
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                                        value={clinicId}
                                        onChange={(e) => setClinicId(e.target.value)}
                                    >
                                        <option value="">All clinics</option>
                                        {clinics.map((clinic) => (
                                            <option key={clinic.id} value={clinic.id}>
                                                {clinic.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <InputLabel value="Service line" />
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                                        value={businessLine}
                                        onChange={(e) => setBusinessLine(e.target.value)}
                                    >
                                        {businessLines.map((line) => (
                                            <option key={line.value || 'all'} value={line.value}>
                                                {line.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {activeView === 'appointments' ? (
                                    <>
                                        <div>
                                            <InputLabel value="Appointment status" />
                                            <select
                                                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                                                value={appointmentStatus}
                                                onChange={(e) =>
                                                    setAppointmentStatus(e.target.value)
                                                }
                                            >
                                                {appointmentStatuses.map((item) => (
                                                    <option
                                                        key={item.value || 'all'}
                                                        value={item.value}
                                                    >
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <InputLabel value="Cancellation type" />
                                            <select
                                                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                                                value={cancellationType}
                                                onChange={(e) =>
                                                    setCancellationType(e.target.value)
                                                }
                                            >
                                                {cancellationTypes.map((item) => (
                                                    <option
                                                        key={item.value || 'all'}
                                                        value={item.value}
                                                    >
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <InputLabel value="Appointment type" />
                                            <select
                                                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                                                value={appointmentType}
                                                onChange={(e) =>
                                                    setAppointmentType(e.target.value)
                                                }
                                            >
                                                {appointmentTypes.map((item) => (
                                                    <option
                                                        key={item.value || 'all'}
                                                        value={item.value}
                                                    >
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <InputLabel value="Billing status" />
                                            <select
                                                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                                                value={billingStatus}
                                                onChange={(e) =>
                                                    setBillingStatus(e.target.value)
                                                }
                                            >
                                                {billingStatuses.map((item) => (
                                                    <option
                                                        key={item.value || 'all'}
                                                        value={item.value}
                                                    >
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <InputLabel value="Sale type" />
                                            <select
                                                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                                                value={saleType}
                                                onChange={(e) => setSaleType(e.target.value)}
                                            >
                                                {saleTypes.map((item) => (
                                                    <option
                                                        key={item.value || 'all'}
                                                        value={item.value}
                                                    >
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div className={activeView === 'transactions' ? 'lg:col-span-2' : ''}>
                                    <InputLabel value="Search" />
                                    <TextInput
                                        className="mt-1 block w-full"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={
                                            activeView === 'appointments'
                                                ? 'Pet, owner, clinic, notes…'
                                                : 'Invoice #, client, pet, clinic…'
                                        }
                                    />
                                </div>
                            </div>

                            {dateFilterError && (
                                <p className="text-sm text-red-600">{dateFilterError}</p>
                            )}

                            <PrimaryButton type="submit">Apply filters</PrimaryButton>
                        </form>
                    </div>

                    {activeView === 'appointments' && appointments && (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Scheduled
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Clinic
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Pet / Owner
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Billing
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Invoices
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {appointments.data.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="px-4 py-10 text-center text-gray-500"
                                                >
                                                    No appointments match your filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            appointments.data.map((row) => (
                                                <tr key={row.id} className="align-top">
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        {formatClinicDateTime(
                                                            row.scheduled_at,
                                                            appTimezone,
                                                        ) ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3">{row.clinic_name ?? '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">
                                                            {row.pet_name ?? '—'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {row.client_name ?? '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">{row.type_label}</td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge status={row.status} />
                                                        <CancellationBadge
                                                            reason={row.cancellation_reason}
                                                        />
                                                        {row.notes && (
                                                            <p
                                                                className="mt-1 max-w-xs truncate text-xs text-gray-500"
                                                                title={row.notes}
                                                            >
                                                                {row.notes}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {row.billing_status ? (
                                                            <StatusBadge
                                                                status={row.billing_status}
                                                                type="billing"
                                                            />
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">
                                                        {row.invoice_numbers?.length
                                                            ? row.invoice_numbers.join(', ')
                                                            : '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 pb-4">
                                <PaginationLinks paginator={appointments} />
                            </div>
                        </div>
                    )}

                    {activeView === 'transactions' && transactions && (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="mb-0 grid gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:grid-cols-4">
                                <div className="text-sm">
                                    <span className="text-gray-500">Paid: </span>
                                    <span className="font-semibold">
                                        {summary.billings_paid}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500">Unpaid: </span>
                                    <span className="font-semibold">
                                        {summary.billings_unpaid}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500">Partial: </span>
                                    <span className="font-semibold">
                                        {summary.billings_partial}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500">Collected: </span>
                                    <span className="font-semibold">
                                        {formatPeso(summary.billings_amount_paid)}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Date
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Invoice
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Clinic
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Service line
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Client / Pet
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Amount
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">
                                                Appointment
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.data.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={8}
                                                    className="px-4 py-10 text-center text-gray-500"
                                                >
                                                    No transactions match your filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            transactions.data.map((row) => (
                                                <tr key={row.id} className="align-top">
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        {formatClinicDate(
                                                            row.created_at,
                                                            appTimezone,
                                                        ) ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">
                                                        {row.invoice_number}
                                                        <div className="text-xs font-normal text-gray-500">
                                                            {row.sale_type_label}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">{row.clinic_name ?? '—'}</td>
                                                    <td className="px-4 py-3">
                                                        {row.business_line_label}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div>{row.client_name ?? '—'}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {row.pet_name ?? 'Walk-in / retail'}
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <div>{formatPeso(row.total_amount)}</div>
                                                        <div className="text-xs text-gray-500">
                                                            Paid {formatPeso(row.amount_paid)}
                                                        </div>
                                                        {row.payment_methods?.length > 0 && (
                                                            <div className="text-xs capitalize text-gray-400">
                                                                {row.payment_methods.join(', ')}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge
                                                            status={row.status}
                                                            type="billing"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {row.appointment_id ? (
                                                            <>
                                                                <StatusBadge
                                                                    status={row.appointment_status}
                                                                />
                                                                <div className="mt-1 text-xs text-gray-500">
                                                                    {formatClinicDateTime(
                                                                        row.appointment_scheduled_at,
                                                                        appTimezone,
                                                                    ) ?? '—'}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 pb-4">
                                <PaginationLinks paginator={transactions} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
