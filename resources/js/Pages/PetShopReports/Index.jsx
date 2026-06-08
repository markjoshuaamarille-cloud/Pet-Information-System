import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';

function ProductRow({ product, rank }) {
    return (
        <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 text-xs text-gray-400">{rank}</td>
            <td className="px-4 py-2 text-sm font-medium text-gray-800">{product.name}</td>
            <td className="px-4 py-2 text-xs text-gray-500 capitalize">{product.category?.replace(/_/g, ' ')}</td>
            <td className="px-4 py-2 text-right text-sm font-semibold text-gray-800">{Number(product.total_qty).toLocaleString()}</td>
            <td className="px-4 py-2 text-right text-sm text-gray-700">
                ₱{Number(product.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
        </tr>
    );
}

export default function PetShopReportsIndex({ reportData, period, periods }) {
    const activeClinic = usePage().props.activeClinic;

    const changePeriod = (p) => {
        router.get(route('pet-shop-reports.index'), { period: p }, { preserveState: true });
    };

    const periodEntries = Object.entries(reportData ?? {});

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Pet Shop Reports</h2>}>
            <Head title="Pet Shop Reports" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    {activeClinic && (
                        <p className="mb-4 text-sm text-gray-500">Showing data for: <span className="font-medium text-gray-700">{activeClinic.name}</span></p>
                    )}

                    {/* Period selector */}
                    <div className="mb-6 flex flex-wrap gap-2">
                        {periods.map(p => (
                            <button
                                key={p.value}
                                onClick={() => changePeriod(p.value)}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                                    period === p.value
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-600 shadow hover:bg-indigo-50'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {periodEntries.length === 0 && (
                        <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow">
                            No paid pet shop orders found for this period.
                        </div>
                    )}

                    <div className="space-y-6">
                        {periodEntries.map(([label, data]) => (
                            <div key={label} className="overflow-hidden rounded-lg bg-white shadow">
                                <div className="border-b bg-gray-50 px-5 py-3">
                                    <h3 className="font-semibold text-gray-700">Period: {label}</h3>
                                </div>
                                <div className="grid gap-0 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                    {/* Fast moving */}
                                    <div>
                                        <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-50">
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
                                                    <ProductRow key={p.id + '-' + label} product={p} rank={i + 1} />
                                                ))}
                                                {(data.fast_moving ?? []).length === 0 && (
                                                    <tr><td colSpan={5} className="px-4 py-3 text-center text-xs text-gray-400">No data</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Slow moving */}
                                    <div>
                                        <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-red-700 bg-red-50">
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
                                                    <ProductRow key={p.id + '-slow-' + label} product={p} rank={i + 1} />
                                                ))}
                                                {(data.slow_moving ?? []).length === 0 && (
                                                    <tr><td colSpan={5} className="px-4 py-3 text-center text-xs text-gray-400">No data</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
