import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function ReportsIndex({ summary }) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Reports</h2>}>
            <Head title="Reports" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            ['Total Pets', summary.total_pets],
                            ['Health Activity Records', summary.total_health_records],
                            ['Inventory Items', summary.inventory_items],
                            ['Expired Items', summary.expired_items],
                        ].map(([label, val]) => (
                            <div key={label} className="rounded-lg bg-white p-4 shadow">
                                <p className="text-sm text-gray-500">{label}</p>
                                <p className="text-2xl font-bold">{val}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Link href={route('reports.pets')} className="rounded-lg bg-white p-6 shadow hover:ring-2 hover:ring-indigo-500">
                            <h3 className="font-semibold">Pets Report</h3>
                            <p className="mt-1 text-sm text-gray-600">Full pet records with health history summary.</p>
                        </Link>
                        <Link href={route('reports.inventory')} className="rounded-lg bg-white p-6 shadow hover:ring-2 hover:ring-indigo-500">
                            <h3 className="font-semibold">Inventory Report</h3>
                            <p className="mt-1 text-sm text-gray-600">Medicine stock levels, expiry, and status.</p>
                        </Link>
                    </div>
                    <div className="mt-6 rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-1 font-semibold">Health Activity Breakdown</h3>
                        <p className="mb-3 text-xs text-gray-500">
                            Includes pet health records plus vaccination and grooming module entries.
                        </p>
                        <ul className="grid gap-2 text-sm sm:grid-cols-2">
                            <li>Consultations: {summary.consultations}</li>
                            <li>Vaccinations: {summary.vaccinations}</li>
                            <li>Grooming: {summary.grooming}</li>
                            <li>Medications: {summary.medications}</li>
                            <li>Surgery records: {summary.surgeries}</li>
                            <li>Boarding stays: {summary.boarding_stays}</li>
                            <li>Emergency care: {summary.emergency_care}</li>
                            <li>Critical Stock Items: {summary.critical_items}</li>
                        </ul>
                        <p className="mt-3 text-xs text-gray-500">
                            Activity total: {summary.consultations + summary.vaccinations + summary.grooming + summary.medications + summary.surgeries + summary.boarding_stays + summary.emergency_care} records
                        </p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
