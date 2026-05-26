import { Head } from '@inertiajs/react';

const formatDate = (value) => {
    if (!value) {
        return '—';
    }

    const iso = String(value);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleDateString();
};

export default function ClientRecord({ pet }) {
    return (
        <div className="min-h-screen bg-white p-8 print:p-4">
            <Head title={`Record - ${pet.pet_name}`} />
            <div className="mx-auto max-w-3xl">
                <div className="mb-6 border-b pb-4 text-center">
                    <h1 className="text-2xl font-bold">Pet Care Management System</h1>
                    <p className="text-gray-600">Client Pet Health Record</p>
                </div>

                <section className="mb-6">
                    <h2 className="mb-2 text-lg font-semibold">Owner Information</h2>
                    <p><strong>Name:</strong> {pet.client?.name}</p>
                    <p><strong>Contact:</strong> {pet.client?.contact}</p>
                    <p><strong>Address:</strong> {pet.client?.address || '—'}</p>
                </section>

                <section className="mb-6">
                    <h2 className="mb-2 text-lg font-semibold">Pet Information</h2>
                    <p><strong>Name:</strong> {pet.pet_name}</p>
                    <p><strong>Species:</strong> {pet.species} · <strong>Breed:</strong> {pet.breed || '—'}</p>
                    <p><strong>Age:</strong> {pet.age ?? '—'} · <strong>Gender:</strong> {pet.gender || '—'}</p>
                    <p><strong>Birth Date:</strong> {formatDate(pet.birth_date)}</p>
                    <p><strong>Weight:</strong> {pet.weight ? `${pet.weight} kg` : '—'}</p>
                    <p><strong>Color:</strong> {pet.color || '—'}</p>
                    <p><strong>Microchip No:</strong> {pet.microchip_no || '—'}</p>
                    <p>
                        <strong>Vaccination Status:</strong>{' '}
                        {{
                            up_to_date: 'Up to Date',
                            partial: 'Partial',
                            not_vaccinated: 'Not Vaccinated',
                            unknown: 'Unknown',
                        }[pet.vaccination_status] || 'Unknown'}
                    </p>
                    <p><strong>General Notes:</strong> {pet.medical_history || 'None'}</p>
                </section>

                <section>
                    <h2 className="mb-3 text-lg font-semibold">Checkup History</h2>
                    <table className="w-full border text-sm">
                        <thead><tr className="bg-gray-100"><th className="border p-2 text-left">Date</th><th className="border p-2 text-left">Type</th><th className="border p-2 text-left">Details</th><th className="border p-2 text-left">Next Due</th></tr></thead>
                        <tbody>
                            {pet.health_records?.map((r) => (
                                <tr key={r.id}>
                                    <td className="border p-2">{formatDate(r.record_date)}</td>
                                    <td className="border p-2 capitalize">{r.type}</td>
                                    <td className="border p-2">{r.title}{r.medicine ? ` — ${r.medicine.name}` : ''}{r.dosage ? ` (${r.dosage})` : ''}</td>
                                    <td className="border p-2">{formatDate(r.next_due_date)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <p className="mt-8 text-center text-xs text-gray-400">Generated {new Date().toLocaleDateString()}</p>
                <button onClick={() => window.print()} className="mt-4 rounded bg-indigo-600 px-4 py-2 text-white print:hidden">Print Record</button>
            </div>
        </div>
    );
}
