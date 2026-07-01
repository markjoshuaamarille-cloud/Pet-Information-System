import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { formatClinicDate, formatClinicDateTime } from '@/utils/formatDateTime';

const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const formatDate = (value) => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString();
};

const formatDateTime = (value, timeZone = 'Asia/Manila') => formatClinicDateTime(value, timeZone);

function activeFilterLabel(filters, periods) {
    if (filters.date_from && filters.date_to) {
        const from = formatClinicDate(filters.date_from) ?? filters.date_from;
        const to = formatClinicDate(filters.date_to) ?? filters.date_to;
        return `${from} – ${to}`;
    }

    if (filters.date_from) {
        return `From ${formatClinicDate(filters.date_from) ?? filters.date_from}`;
    }

    if (filters.date_to) {
        return `Until ${formatClinicDate(filters.date_to) ?? filters.date_to}`;
    }

    return periods.find((p) => p.value === (filters.period ?? 'monthly'))?.label ?? 'This Month';
}

function transactionDateKey(transactionAt) {
    if (!transactionAt) {
        return null;
    }

    const match = String(transactionAt).match(/^(\d{4}-\d{2}-\d{2})/);

    return match?.[1] ?? null;
}

function unsettledFromTransactions(transactions, clinicId, periodStart, periodEnd) {
    return transactions.filter((transaction) => {
        if (transaction.is_settled) {
            return false;
        }

        if (clinicId && String(transaction.clinic_id) !== String(clinicId)) {
            return false;
        }

        const dateKey = transactionDateKey(transaction.transaction_at);

        if (!dateKey) {
            return false;
        }

        if (periodStart && dateKey < periodStart) {
            return false;
        }

        if (periodEnd && dateKey > periodEnd) {
            return false;
        }

        return true;
    });
}
function StatCard({ label, value, accent = 'indigo' }) {
    const accents = {
        indigo: 'border-indigo-100 bg-indigo-50 text-indigo-900',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-900',
        amber: 'border-amber-100 bg-amber-50 text-amber-900',
        violet: 'border-violet-100 bg-violet-50 text-violet-900',
    };

    return (
        <div className={`rounded-xl border p-5 shadow-sm ${accents[accent] ?? accents.indigo}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
    );
}

function SettlementForm({
    clinics,
    unsettledTransactions = [],
    reportDateFrom = '',
    reportDateTo = '',
    reportClinicId = '',
}) {
    const [selectedClinicId, setSelectedClinicId] = useState(reportClinicId ? String(reportClinicId) : '');
    const [periodStart, setPeriodStart] = useState(reportDateFrom);
    const [periodEnd, setPeriodEnd] = useState(reportDateTo);

    const matchingTransactions = useMemo(
        () => unsettledFromTransactions(unsettledTransactions, selectedClinicId, periodStart, periodEnd),
        [unsettledTransactions, selectedClinicId, periodStart, periodEnd],
    );

    const unsettledTotal = useMemo(
        () => matchingTransactions.reduce((sum, row) => sum + row.commission_amount, 0),
        [matchingTransactions],
    );

    const form = useForm({
        clinic_id: reportClinicId ? String(reportClinicId) : '',
        amount_received: '',
        payment_method: 'cash',
        paid_at: new Date().toISOString().slice(0, 16),
        reference_number: '',
        notes: '',
        period_start: reportDateFrom,
        period_end: reportDateTo,
    });

    useEffect(() => {
        setPeriodStart(reportDateFrom);
        setPeriodEnd(reportDateTo);
        form.setData((data) => ({
            ...data,
            period_start: reportDateFrom,
            period_end: reportDateTo,
        }));
    }, [reportDateFrom, reportDateTo]);

    useEffect(() => {
        if (!reportClinicId) {
            return;
        }

        setSelectedClinicId(String(reportClinicId));
        form.setData('clinic_id', String(reportClinicId));
    }, [reportClinicId]);

    useEffect(() => {
        if (!selectedClinicId) {
            return;
        }

        form.setData('amount_received', unsettledTotal > 0 ? unsettledTotal.toFixed(2) : '');
    }, [unsettledTotal, selectedClinicId]);

    const submit = (e) => {
        e.preventDefault();

        if (periodStart && periodEnd && periodStart > periodEnd) {
            return;
        }

        form.transform((data) => ({
            ...data,
            clinic_id: Number(data.clinic_id),
            amount_received: Number(data.amount_received),
            period_start: data.period_start || null,
            period_end: data.period_end || null,
        }));

        form.post(route('admin.platform-commissions.settlements.store'), {
            preserveScroll: true,
        });
    };

    const updatePeriodStart = (value) => {
        setPeriodStart(value);
        form.setData('period_start', value);
    };

    const updatePeriodEnd = (value) => {
        setPeriodEnd(value);
        form.setData('period_end', value);
    };

    const applyClinic = (clinicId) => {
        setSelectedClinicId(String(clinicId));
        form.setData('clinic_id', String(clinicId));
    };

    return (
        <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Record commission payment</h3>
            <p className="mt-1 text-sm text-gray-500">
                Generate a receipt when a partnered business pays platform commission to the app owner.
                Period dates match Transaction History payment dates for the selected clinic.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                    <InputLabel value="Clinic / business" />
                    <select
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                        value={form.data.clinic_id}
                        onChange={(e) => applyClinic(e.target.value)}
                    >
                        <option value="">Select clinic</option>
                        {clinics.map((clinic) => (
                            <option key={clinic.id} value={clinic.id}>
                                {clinic.name}
                            </option>
                        ))}
                    </select>
                    <InputError message={form.errors.clinic_id} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Amount received (commission)" />
                    <TextInput
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="mt-1 block w-full"
                        value={form.data.amount_received}
                        onChange={(e) => form.setData('amount_received', e.target.value)}
                    />
                    {selectedClinicId && (
                        <p className="mt-1 text-xs text-gray-500">
                            {matchingTransactions.length} unsettled transaction
                            {matchingTransactions.length === 1 ? '' : 's'} in this period ·{' '}
                            {formatPeso(unsettledTotal)}
                        </p>
                    )}
                    <InputError message={form.errors.amount_received} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Period start (Transaction History date)" />
                    <TextInput
                        type="date"
                        className="mt-1 block w-full"
                        value={periodStart}
                        max={periodEnd || undefined}
                        onChange={(e) => updatePeriodStart(e.target.value)}
                    />
                </div>
                <div>
                    <InputLabel value="Period end (Transaction History date)" />
                    <TextInput
                        type="date"
                        className="mt-1 block w-full"
                        value={periodEnd}
                        min={periodStart || undefined}
                        onChange={(e) => updatePeriodEnd(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Filters unsettled rows by the same payment date shown in Transaction History.
                        {(reportDateFrom || reportDateTo) && ' Prefilled from the report filter above.'}
                    </p>
                </div>
                <div>
                    <InputLabel value="Payment method" />
                    <select
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                        value={form.data.payment_method}
                        onChange={(e) => form.setData('payment_method', e.target.value)}
                    >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="gcash">GCash</option>
                        <option value="maya">Maya</option>
                        <option value="bank_transfer">Bank Transfer</option>
                    </select>
                </div>
                <div>
                    <InputLabel value="Paid at" />
                    <TextInput
                        type="datetime-local"
                        className="mt-1 block w-full"
                        value={form.data.paid_at}
                        onChange={(e) => form.setData('paid_at', e.target.value)}
                    />
                    <InputError message={form.errors.paid_at} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                    <InputLabel value="Reference number" />
                    <TextInput
                        className="mt-1 block w-full"
                        value={form.data.reference_number}
                        onChange={(e) => form.setData('reference_number', e.target.value)}
                    />
                </div>
                <div className="md:col-span-2">
                    <InputLabel value="Notes" />
                    <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                        rows={2}
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <PrimaryButton disabled={form.processing}>Record payment & generate receipt</PrimaryButton>
            </div>
        </form>
    );
}

export default function PlatformCommissionsIndex({
    commissionRate,
    summary,
    byClinic = [],
    byBusinessLine = [],
    unsettledByClinic = [],
    transactions = [],
    unsettledTransactions = [],
    settlements = [],
    filters = {},
    clinics = [],
    periods = [],
    businessLines = [],
}) {
    const appTimezone = usePage().props.appTimezone ?? 'Asia/Manila';
    const [selectedPeriod, setSelectedPeriod] = useState(filters.period ?? 'monthly');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [clinicFilter, setClinicFilter] = useState(
        filters.clinic_id ? String(filters.clinic_id) : '',
    );
    const [businessLineFilter, setBusinessLineFilter] = useState(filters.business_line ?? '');
    const [dateFilterError, setDateFilterError] = useState('');

    const hasCustomRange = Boolean(dateFrom || dateTo);

    useEffect(() => {
        setDateFrom(filters.date_from ?? '');
        setDateTo(filters.date_to ?? '');
        setClinicFilter(filters.clinic_id ? String(filters.clinic_id) : '');
        setBusinessLineFilter(filters.business_line ?? '');
        if (!filters.using_custom_range) {
            setSelectedPeriod(filters.period ?? 'monthly');
        }
    }, [
        filters.date_from,
        filters.date_to,
        filters.clinic_id,
        filters.business_line,
        filters.period,
        filters.using_custom_range,
    ]);

    const filterKey = [
        filters.period ?? '',
        filters.date_from ?? '',
        filters.date_to ?? '',
        filters.clinic_id ?? '',
        filters.business_line ?? '',
    ].join('|');

    const settingsForm = useForm({
        commission_rate: String(commissionRate ?? 20),
    });

    const buildParams = ({ period, df, dt, clinic, line } = {}) => {
        const p = {};
        const from = df !== undefined ? df : dateFrom;
        const to = dt !== undefined ? dt : dateTo;

        if (from || to) {
            if (from) {
                p.date_from = from;
            }
            if (to) {
                p.date_to = to;
            }
        } else {
            p.period = period !== undefined ? period : selectedPeriod;
        }

        const cl = clinic !== undefined ? clinic : clinicFilter;
        const bl = line !== undefined ? line : businessLineFilter;

        if (cl) {
            p.clinic_id = cl;
        }
        if (bl) {
            p.business_line = bl;
        }

        return p;
    };

    const go = (params) => {
        router.get(route('admin.platform-commissions.index'), params, {
            preserveScroll: true,
        });
    };

    const applyFilters = () => {
        if (dateFrom && dateTo && dateFrom > dateTo) {
            setDateFilterError('The From date must be on or before the To date.');
            return;
        }

        setDateFilterError('');
        go(buildParams());
    };

    const changePeriod = (period) => {
        setSelectedPeriod(period);
        setDateFrom('');
        setDateTo('');
        setDateFilterError('');
        go(buildParams({ period, df: '', dt: '' }));
    };

    const appliedFilterLabel = activeFilterLabel(filters, periods);

    const saveCommissionRate = (e) => {
        e.preventDefault();
        settingsForm.put(route('admin.platform-commissions.settings.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Platform Commissions & Earnings
                </h2>
            }
        >
            <Head title="Platform Commissions" />

            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <form
                        onSubmit={saveCommissionRate}
                        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                    >
                        <h3 className="text-lg font-semibold text-gray-900">Commission settings</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Default platform commission applied to every successful payment.
                            Formula: Transaction Amount × Rate = Platform Commission.
                            Saving a new rate recalculates all unsettled transactions. Settled
                            transactions keep the rate recorded at settlement.
                        </p>
                        <div className="mt-4 flex flex-wrap items-end gap-4">
                            <div className="w-40">
                                <InputLabel value="Commission rate (%)" />
                                <TextInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="mt-1 block w-full"
                                    value={settingsForm.data.commission_rate}
                                    onChange={(e) =>
                                        settingsForm.setData('commission_rate', e.target.value)
                                    }
                                />
                                <InputError
                                    message={settingsForm.errors.commission_rate}
                                    className="mt-1"
                                />
                            </div>
                            <PrimaryButton disabled={settingsForm.processing}>
                                Save rate
                            </PrimaryButton>
                        </div>
                    </form>

                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">Report filters</h3>
                            <div className="flex flex-wrap gap-2">
                                {periods.map((period) => (
                                    <button
                                        key={period.value}
                                        type="button"
                                        onClick={() => changePeriod(period.value)}
                                        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                                            selectedPeriod === period.value && !hasCustomRange
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {period.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form
                            className="mt-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                applyFilters();
                            }}
                        >
                        <div className="grid gap-4 md:grid-cols-4">
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
                                    value={clinicFilter}
                                    onChange={(e) => setClinicFilter(e.target.value)}
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
                                    value={businessLineFilter}
                                    onChange={(e) => setBusinessLineFilter(e.target.value)}
                                >
                                    {businessLines.map((line) => (
                                        <option key={line.value} value={line.value}>
                                            {line.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {dateFilterError && (
                            <InputError message={dateFilterError} className="mt-3" />
                        )}

                        <p className="mt-3 text-xs text-gray-500">
                            Set From and/or To to filter Transaction History by payment date.
                            Leave both empty to use a preset period above.
                        </p>

                        <div className="mt-4 flex gap-2">
                            <PrimaryButton type="submit">
                                Apply filters
                            </PrimaryButton>
                            <SecondaryButton
                                type="button"
                                onClick={() => {
                                    setSelectedPeriod('monthly');
                                    setDateFrom('');
                                    setDateTo('');
                                    setClinicFilter('');
                                    setBusinessLineFilter('');
                                    setDateFilterError('');
                                    go({ period: 'monthly' });
                                }}
                            >
                                Reset
                            </SecondaryButton>
                        </div>
                        </form>
                    </div>

                    <div key={filterKey} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <StatCard
                            label="Total transactions"
                            value={summary.transaction_count}
                            accent="indigo"
                        />
                        <StatCard
                            label="Total transaction amount"
                            value={formatPeso(summary.total_gross)}
                            accent="emerald"
                        />
                        <StatCard
                            label="Platform commission earned"
                            value={formatPeso(summary.total_commission)}
                            accent="violet"
                        />
                        <StatCard
                            label="Business net earnings"
                            value={formatPeso(summary.total_business_earnings)}
                            accent="amber"
                        />
                        <StatCard
                            label="Unsettled commission"
                            value={formatPeso(summary.unsettled_commission)}
                            accent="amber"
                        />
                        <StatCard
                            label="Settled commission (all time)"
                            value={formatPeso(summary.settled_commission)}
                            accent="emerald"
                        />
                    </div>

                    <div key={`${filterKey}-tables`} className="grid gap-6 xl:grid-cols-2">
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 px-4 py-3">
                                <h3 className="font-semibold text-gray-900">Earnings by clinic</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Clinic</th>
                                            <th className="px-4 py-2 text-right">Transactions</th>
                                            <th className="px-4 py-2 text-right">Gross</th>
                                            <th className="px-4 py-2 text-right">Commission</th>
                                            <th className="px-4 py-2 text-right">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {byClinic.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                                                    No commission data for this period.
                                                </td>
                                            </tr>
                                        )}
                                        {byClinic.map((row) => (
                                            <tr key={row.clinic_id}>
                                                <td className="px-4 py-2 font-medium">{row.clinic_name}</td>
                                                <td className="px-4 py-2 text-right">{row.transaction_count}</td>
                                                <td className="px-4 py-2 text-right">{formatPeso(row.total_gross)}</td>
                                                <td className="px-4 py-2 text-right">{formatPeso(row.total_commission)}</td>
                                                <td className="px-4 py-2 text-right">{formatPeso(row.total_business_earnings)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 px-4 py-3">
                                <h3 className="font-semibold text-gray-900">By service line</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Service</th>
                                            <th className="px-4 py-2 text-right">Transactions</th>
                                            <th className="px-4 py-2 text-right">Commission</th>
                                            <th className="px-4 py-2 text-right">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {byBusinessLine.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                                                    No data for this period.
                                                </td>
                                            </tr>
                                        )}
                                        {byBusinessLine.map((row) => (
                                            <tr key={row.business_line}>
                                                <td className="px-4 py-2 font-medium">{row.label}</td>
                                                <td className="px-4 py-2 text-right">{row.transaction_count}</td>
                                                <td className="px-4 py-2 text-right">{formatPeso(row.total_commission)}</td>
                                                <td className="px-4 py-2 text-right">{formatPeso(row.total_business_earnings)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div key={`${filterKey}-history`} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="font-semibold text-gray-900">Transaction history</h3>
                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
                                    {appliedFilterLabel}
                                    {transactions.length > 0 && (
                                        <> · {transactions.length} record{transactions.length === 1 ? '' : 's'}</>
                                    )}
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Date</th>
                                        <th className="px-4 py-2 text-left">Clinic</th>
                                        <th className="px-4 py-2 text-left">Invoice</th>
                                        <th className="px-4 py-2 text-left">Service</th>
                                        <th className="px-4 py-2 text-right">Amount</th>
                                        <th className="px-4 py-2 text-right">Rate</th>
                                        <th className="px-4 py-2 text-right">Commission</th>
                                        <th className="px-4 py-2 text-right">Net</th>
                                        <th className="px-4 py-2 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                                                No transactions found for {appliedFilterLabel.toLowerCase()}.
                                            </td>
                                        </tr>
                                    )}
                                    {transactions.map((row) => (
                                        <tr key={row.id}>
                                            <td className="px-4 py-2">{formatDateTime(row.transaction_at, appTimezone)}</td>
                                            <td className="px-4 py-2">{row.clinic_name}</td>
                                            <td className="px-4 py-2">{row.invoice_number ?? '—'}</td>
                                            <td className="px-4 py-2">{row.business_line_label}</td>
                                            <td className="px-4 py-2 text-right">{formatPeso(row.transaction_amount)}</td>
                                            <td className="px-4 py-2 text-right">{row.commission_rate}%</td>
                                            <td className="px-4 py-2 text-right">{formatPeso(row.commission_amount)}</td>
                                            <td className="px-4 py-2 text-right">{formatPeso(row.business_earnings)}</td>
                                            <td className="px-4 py-2">
                                                {row.is_settled ? (
                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                                                        Settled
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                                                        Unsettled
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <SettlementForm
                        clinics={clinics}
                        unsettledTransactions={unsettledTransactions}
                        reportDateFrom={filters.date_from ?? ''}
                        reportDateTo={filters.date_to ?? ''}
                        reportClinicId={filters.clinic_id ?? ''}
                    />

                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 px-4 py-3">
                            <h3 className="font-semibold text-gray-900">Commission payment receipts</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Receipt</th>
                                        <th className="px-4 py-2 text-left">Clinic</th>
                                        <th className="px-4 py-2 text-right">Transactions</th>
                                        <th className="px-4 py-2 text-right">Commission paid</th>
                                        <th className="px-4 py-2 text-left">Paid at</th>
                                        <th className="px-4 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {settlements.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                                                No commission payments recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                    {settlements.map((row) => (
                                        <tr key={row.id}>
                                            <td className="px-4 py-2 font-medium">{row.receipt_number}</td>
                                            <td className="px-4 py-2">{row.clinic_name}</td>
                                            <td className="px-4 py-2 text-right">{row.transaction_count}</td>
                                            <td className="px-4 py-2 text-right">{formatPeso(row.amount_received)}</td>
                                            <td className="px-4 py-2">{formatDateTime(row.paid_at, appTimezone)}</td>
                                            <td className="px-4 py-2 text-right">
                                                <Link
                                                    href={route(
                                                        'admin.platform-commissions.settlement-receipt',
                                                        row.id,
                                                    )}
                                                    className="text-indigo-600 hover:underline"
                                                >
                                                    View receipt
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
