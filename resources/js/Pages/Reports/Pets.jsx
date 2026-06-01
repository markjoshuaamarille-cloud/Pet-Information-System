import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ListDisplayControls from '@/Components/ListDisplayControls';
import useListDisplayLimit from '@/hooks/useListDisplayLimit';
import { Head, Link } from '@inertiajs/react';

export default function ReportsPets({ pets }) {
    const {
        visibleItems: visiblePets,
        displayLimit,
        setDisplayLimit,
        totalCount: petListCount,
        showingCount: petShowingCount,
    } = useListDisplayLimit(pets);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Pets Report</h2>}>
            <Head title="Pets Report" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 flex justify-between">
                        <Link href={route('reports.index')} className="text-sm text-gray-600 hover:underline">← Back</Link>
                        <div className="flex items-center gap-2 print:hidden">
                            <a
                                href={route('reports.pets.export')}
                                className="rounded bg-emerald-600 px-3 py-1 text-sm text-white"
                            >
                                Export CSV
                            </a>
                            <button onClick={() => window.print()} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">
                                Print
                            </button>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-lg bg-white shadow print:shadow-none">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Pet</th><th className="px-4 py-3 text-left">Species</th><th className="px-4 py-3 text-left">Owner</th><th className="px-4 py-3 text-left">Health Records</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                                {visiblePets.map((p) => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-3">{p.pet_name}</td>
                                        <td className="px-4 py-3">{p.species}</td>
                                        <td className="px-4 py-3">{p.client?.name}</td>
                                        <td className="px-4 py-3">{p.health_records?.length ?? 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <ListDisplayControls
                            totalCount={petListCount}
                            showingCount={petShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
