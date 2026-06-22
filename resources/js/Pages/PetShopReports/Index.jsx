import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { useState } from 'react';

const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const formatCategory = (category) =>
    category?.replace(/_/g, ' ') ?? '—';

function ProductRow({ product, rank }) {
    return (
        <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 text-xs text-gray-400">{rank}</td>
            <td className="px-4 py-2 text-sm font-medium text-gray-800">{product.name}</td>
            <td className="px-4 py-2 text-xs capitalize text-gray-500">{formatCategory(product.category)}</td>
            <td className="px-4 py-2 text-right text-sm font-semibold text-gray-800">
                {Number(product.total_qty).toLocaleString()}
            </td>
            <td className="px-4 py-2 text-right text-sm text-gray-700">
                {formatPeso(product.total_revenue)}
            </td>
        </tr>
    );
}

function StatCard({ label, value, accent = 'indigo' }) {
    const accents = {
        indigo: 'border-indigo-100 bg-indigo-50 text-indigo-800',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800',
        amber: 'border-amber-100 bg-amber-50 text-amber-800',
        violet: 'border-violet-100 bg-violet-50 text-violet-800',
    };

    return (
        <div className={`rounded-xl border p-5 shadow-sm ${accents[accent] ?? accents.indigo}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

function BarChart({ items, valueKey = 'revenue' }) {
    const max = Math.max(...items.map((item) => Number(item[valueKey] ?? 0)), 1);

    if (items.length === 0) {
        return <p className="text-sm text-gray-400">No data for this period.</p>;
    }

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                        <span>{item.label}</span>
                        <span className="font-medium">
                            {valueKey === 'revenue' ? formatPeso(item.revenue) : item.orders}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${(Number(item[valueKey] ?? 0) / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function PetShopReportsIndex({
    summary,
    salesTrend = [],
    categoryRevenue = [],
    paymentMethods = [],
    topCustomers = [],
    zeroSales = [],
    reorderAlerts = [],
    reportData,
    filters = {},
    periods,
}) {
    const activeClinic = usePage().props.activeClinic;
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [exportingCsv, setExportingCsv] = useState(false);

    const queryParams = () => {
        const params = { period: filters.period ?? 'monthly' };
        if (dateFrom && dateTo) {
            params.date_from = dateFrom;
            params.date_to = dateTo;
        }
        return params;
    };

    const applyFilters = () => {
        router.get(route('pet-shop-reports.index'), queryParams(), { preserveState: true });
    };

    const changePeriod = (period) => {
        router.get(
            route('pet-shop-reports.index'),
            { period, date_from: dateFrom || undefined, date_to: dateTo || undefined },
            { preserveState: true },
        );
    };

    const clearDateRange = () => {
        setDateFrom('');
        setDateTo('');
        router.get(route('pet-shop-reports.index'), { period: filters.period ?? 'monthly' }, {
            preserveState: true,
        });
    };

    const exportUrl = route('pet-shop-reports.export', queryParams());

    const handleExportCsv = async () => {
        if (exportingCsv) {
            return;
        }

        setExportingCsv(true);

        try {
            const response = await window.axios.get(exportUrl, {
                responseType: 'blob',
            });

            const contentType = response.headers['content-type'] ?? '';
            if (!contentType.includes('text/csv')) {
                window.location.assign(exportUrl);
                return;
            }

            const disposition = response.headers['content-disposition'] ?? '';
            const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
            const filename =
                filenameMatch?.[1] ??
                `pet-shop-report-${new Date().toISOString().slice(0, 10)}.csv`;

            const blob = new Blob([response.data], { type: 'text/csv' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch {
            window.location.assign(exportUrl);
        } finally {
            setExportingCsv(false);
        }
    };

    const periodEntries = Object.entries(reportData ?? {});
    const hasData =
        Number(summary?.total_orders ?? 0) > 0 || periodEntries.length > 0;

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Pet Shop Reports</h2>}>
            <Head title="Pet Shop Reports" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    {activeClinic && (
                        <p className="mb-4 text-sm text-gray-500">
                            Showing data for:{' '}
                            <span className="font-medium text-gray-700">{activeClinic.name}</span>
                        </p>
                    )}

                    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                            {periods.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => changePeriod(p.value)}
                                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                                        (filters.period ?? 'monthly') === p.value
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-gray-600 shadow hover:bg-indigo-50'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            disabled={exportingCsv}
                            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {exportingCsv ? 'Exporting…' : 'Export CSV'}
                        </button>
                    </div>

                    <div className="mb-6 rounded-lg bg-white p-4 shadow">
                        <p className="mb-3 text-sm font-semibold text-gray-700">Custom date range</p>
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="mb-1 block text-xs text-gray-500">From</label>
                                <TextInput
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-gray-500">To</label>
                                <TextInput
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>
                            <PrimaryButton type="button" onClick={applyFilters}>
                                Apply
                            </PrimaryButton>
                            {(filters.date_from || filters.date_to) && (
                                <button
                                    type="button"
                                    onClick={clearDateRange}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Clear range
                                </button>
                            )}
                        </div>
                        {filters.using_custom_range && (
                            <p className="mt-2 text-xs text-indigo-600">
                                Filtering by custom date range. Product movement shows combined totals for this range.
                            </p>
                        )}
                    </div>

                    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Total Revenue" value={formatPeso(summary?.total_revenue)} accent="emerald" />
                        <StatCard label="Paid Orders" value={Number(summary?.total_orders ?? 0).toLocaleString()} accent="indigo" />
                        <StatCard label="Units Sold" value={Number(summary?.units_sold ?? 0).toLocaleString()} accent="violet" />
                        <StatCard label="Avg Order Value" value={formatPeso(summary?.avg_order_value)} accent="amber" />
                    </div>

                    {!hasData && (
                        <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow">
                            No paid pet shop orders found for this period.
                        </div>
                    )}

                    {hasData && (
                        <div className="space-y-6">
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="rounded-lg bg-white p-5 shadow">
                                    <h3 className="mb-4 font-semibold text-gray-800">Sales Trend</h3>
                                    <BarChart items={salesTrend} valueKey="revenue" />
                                </div>
                                <div className="rounded-lg bg-white p-5 shadow">
                                    <h3 className="mb-4 font-semibold text-gray-800">Revenue by Category</h3>
                                    {categoryRevenue.length === 0 ? (
                                        <p className="text-sm text-gray-400">No category data.</p>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-gray-500">
                                                <tr>
                                                    <th className="py-2 text-left">Category</th>
                                                    <th className="py-2 text-right">Units</th>
                                                    <th className="py-2 text-right">Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {categoryRevenue.map((row) => (
                                                    <tr key={row.category}>
                                                        <td className="py-2 font-medium text-gray-800">{row.label}</td>
                                                        <td className="py-2 text-right">{row.units}</td>
                                                        <td className="py-2 text-right">{formatPeso(row.revenue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="rounded-lg bg-white p-5 shadow">
                                    <h3 className="mb-4 font-semibold text-gray-800">Payment Methods</h3>
                                    {paymentMethods.length === 0 ? (
                                        <p className="text-sm text-gray-400">No payments recorded.</p>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-gray-500">
                                                <tr>
                                                    <th className="py-2 text-left">Method</th>
                                                    <th className="py-2 text-right">Count</th>
                                                    <th className="py-2 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {paymentMethods.map((row) => (
                                                    <tr key={row.method}>
                                                        <td className="py-2 font-medium text-gray-800">{row.label}</td>
                                                        <td className="py-2 text-right">{row.count}</td>
                                                        <td className="py-2 text-right">{formatPeso(row.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <div className="rounded-lg bg-white p-5 shadow">
                                    <h3 className="mb-4 font-semibold text-gray-800">Top Customers</h3>
                                    {topCustomers.length === 0 ? (
                                        <p className="text-sm text-gray-400">No customer data.</p>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-gray-500">
                                                <tr>
                                                    <th className="py-2 text-left">Customer</th>
                                                    <th className="py-2 text-right">Orders</th>
                                                    <th className="py-2 text-right">Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {topCustomers.map((row) => (
                                                    <tr key={row.client_id}>
                                                        <td className="py-2 font-medium text-gray-800">{row.name}</td>
                                                        <td className="py-2 text-right">{row.orders}</td>
                                                        <td className="py-2 text-right">{formatPeso(row.revenue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            {(reorderAlerts.length > 0 || zeroSales.length > 0) && (
                                <div className="grid gap-6 lg:grid-cols-2">
                                    {reorderAlerts.length > 0 && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
                                            <h3 className="mb-3 font-semibold text-amber-900">Reorder Alerts</h3>
                                            <p className="mb-3 text-xs text-amber-800">
                                                Fast-moving products at or below reorder level.
                                            </p>
                                            <ul className="space-y-2 text-sm">
                                                {reorderAlerts.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2"
                                                    >
                                                        <span className="font-medium text-gray-800">{item.name}</span>
                                                        <span className="text-xs text-amber-800">
                                                            Stock {item.quantity} · Sold {item.sold_qty}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {zeroSales.length > 0 && (
                                        <div className="rounded-lg bg-white p-5 shadow">
                                            <h3 className="mb-3 font-semibold text-gray-800">No Sales in Period</h3>
                                            <p className="mb-3 text-xs text-gray-500">
                                                Active shop products with zero sales in the selected period.
                                            </p>
                                            <ul className="space-y-2 text-sm">
                                                {zeroSales.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="flex items-center justify-between border-b border-gray-100 pb-2"
                                                    >
                                                        <span className="font-medium text-gray-800">{item.name}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {item.category} · Stock {item.quantity}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {periodEntries.map(([label, data]) => (
                                <div key={label} className="overflow-hidden rounded-lg bg-white shadow">
                                    <div className="border-b bg-gray-50 px-5 py-3">
                                        <h3 className="font-semibold text-gray-700">Period: {label}</h3>
                                    </div>
                                    <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 divide-gray-100">
                                        <div>
                                            <div className="bg-green-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-700">
                                                Fast Moving (Top 10)
                                            </div>
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 text-xs text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">#</th>
                                                        <th className="px-4 py-2 text-left">Product</th>
                                                        <th className="px-4 py-2 text-left">Category</th>
                                                        <th className="px-4 py-2 text-right">Qty Sold</th>
                                                        <th className="px-4 py-2 text-right">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {(data.fast_moving ?? []).map((p, i) => (
                                                        <ProductRow key={`${p.id}-${label}`} product={p} rank={i + 1} />
                                                    ))}
                                                    {(data.fast_moving ?? []).length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-3 text-center text-xs text-gray-400">
                                                                No data
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div>
                                            <div className="bg-red-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-red-700">
                                                Slow Moving / Not Moving (Bottom 10)
                                            </div>
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 text-xs text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">#</th>
                                                        <th className="px-4 py-2 text-left">Product</th>
                                                        <th className="px-4 py-2 text-left">Category</th>
                                                        <th className="px-4 py-2 text-right">Qty Sold</th>
                                                        <th className="px-4 py-2 text-right">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {(data.slow_moving ?? []).map((p, i) => (
                                                        <ProductRow key={`${p.id}-slow-${label}`} product={p} rank={i + 1} />
                                                    ))}
                                                    {(data.slow_moving ?? []).length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-4 py-3 text-center text-xs text-gray-400">
                                                                No data
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
