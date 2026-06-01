import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ListDisplayControls from '@/Components/ListDisplayControls';
import useListDisplayLimit from '@/hooks/useListDisplayLimit';
import { Head, Link } from '@inertiajs/react';

export default function ReportsInventory({ medicines }) {
    const {
        visibleItems: visibleMedicines,
        displayLimit,
        setDisplayLimit,
        totalCount: medicineListCount,
        showingCount: medicineShowingCount,
    } = useListDisplayLimit(medicines);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Inventory Report</h2>}>
            <Head title="Inventory Report" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 flex justify-between">
                        <Link href={route('reports.index')} className="text-sm text-gray-600 hover:underline">← Back</Link>
                        <div className="flex items-center gap-2 print:hidden">
                            <a
                                href={route('reports.inventory.export')}
                                className="rounded bg-emerald-600 px-3 py-1 text-sm text-white"
                            >
                                Export CSV
                            </a>
                            <button onClick={() => window.print()} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">
                                Print
                            </button>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Medicine</th><th className="px-4 py-3 text-left">Quantity</th><th className="px-4 py-3 text-left">Expiry</th><th className="px-4 py-3 text-left">Reorder Level</th><th className="px-4 py-3 text-left">Status</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                                {visibleMedicines.map((m) => (
                                    <tr key={m.id}>
                                        <td className="px-4 py-3">{m.name}</td>
                                        <td className="px-4 py-3">{m.quantity} {m.unit}</td>
                                        <td className="px-4 py-3">{m.expiry_date?.slice(0, 10)}</td>
                                        <td className="px-4 py-3">{m.reorder_level}</td>
                                        <td className="px-4 py-3 capitalize">{m.stock_status?.replace('_', ' ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <ListDisplayControls
                            totalCount={medicineListCount}
                            showingCount={medicineShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
