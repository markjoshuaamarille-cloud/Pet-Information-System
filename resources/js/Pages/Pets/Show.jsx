import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { Head, Link, useForm, router } from '@inertiajs/react';

const types = ['consultation', 'vaccination', 'grooming', 'medication'];
const categoryLabels = {
    medicine: 'Medicine',
    supplement_vitamin: 'Supplement / Vitamin',
};
const vaccinationStatusLabels = {
    up_to_date: 'Up to Date',
    partial: 'Partial',
    not_vaccinated: 'Not Vaccinated',
    unknown: 'Unknown',
};

export default function PetShow({ pet, medicines, can_manage_health_records }) {
    const healthForm = useForm({
        type: 'consultation', title: '', description: '', medicine_id: '', dosage: '', medication_quantity: '',
        record_date: new Date().toISOString().slice(0, 10), next_due_date: '', veterinarian_notes: '',
    });

    const addHealth = (e) => {
        e.preventDefault();
        healthForm.post(route('health-records.store', pet.id), { onSuccess: () => healthForm.reset() });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Pet: {pet.pet_name}</h2>}>
            <Head title={pet.pet_name} />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <div className="flex gap-3">
                        <Link href={route('pets.index')} className="text-sm text-gray-600 hover:underline">← Back</Link>
                        <Link href={route('pets.client-record', pet.id)} className="text-sm text-indigo-600 hover:underline">Print Client Record</Link>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-lg bg-white p-6 shadow">
                            <h3 className="mb-3 font-semibold">Pet Information</h3>
                            <div className="mb-4 flex items-start gap-4">
                                {pet.photo_url ? (
                                    <img
                                        src={pet.photo_url}
                                        alt={pet.pet_name}
                                        className="h-32 w-32 shrink-0 rounded-lg border border-gray-200 object-cover shadow-sm"
                                    />
                                ) : (
                                    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                                        No photo
                                    </div>
                                )}
                            </div>
                            <dl className="space-y-2 text-sm">
                                <div><dt className="text-gray-500">Owner</dt><dd>{pet.client?.name} — {pet.client?.contact}</dd></div>
                                <div><dt className="text-gray-500">Species / Breed</dt><dd>{pet.species} {pet.breed && `/ ${pet.breed}`}</dd></div>
                                <div><dt className="text-gray-500">Age / Gender</dt><dd>{pet.age ?? '—'} / {pet.gender ?? '—'}</dd></div>
                                <div><dt className="text-gray-500">Birth Date</dt><dd>{pet.birth_date || '—'}</dd></div>
                                <div><dt className="text-gray-500">Weight</dt><dd>{pet.weight ? `${pet.weight} kg` : '—'}</dd></div>
                                <div><dt className="text-gray-500">Color</dt><dd>{pet.color || '—'}</dd></div>
                                <div><dt className="text-gray-500">Microchip No</dt><dd>{pet.microchip_no || '—'}</dd></div>
                                <div><dt className="text-gray-500">Vaccination Status</dt><dd>{vaccinationStatusLabels[pet.vaccination_status] ?? 'Unknown'}</dd></div>
                                <div><dt className="text-gray-500">Medical History</dt><dd>{pet.medical_history || 'None recorded'}</dd></div>
                            </dl>
                        </div>

                        {can_manage_health_records && (
                            <form onSubmit={addHealth} className="rounded-lg bg-white p-6 shadow">
                                <h3 className="mb-3 font-semibold">Add Health Record</h3>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <InputLabel value="Type" />
                                        <select
                                            className="mt-1 w-full rounded-md border-gray-300"
                                            value={healthForm.data.type}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value !== 'medication') {
                                                    healthForm.setData({
                                                        ...healthForm.data,
                                                        type: value,
                                                        medicine_id: '',
                                                        dosage: '',
                                                        medication_quantity: '',
                                                    });
                                                } else {
                                                    healthForm.setData('type', value);
                                                }
                                            }}
                                        >
                                            {types.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div><InputLabel value="Title" /><TextInput className="mt-1 block w-full" value={healthForm.data.title} onChange={(e) => healthForm.setData('title', e.target.value)} required /></div>
                                    <div><InputLabel value="Date" /><TextInput type="date" className="mt-1 block w-full" value={healthForm.data.record_date} onChange={(e) => healthForm.setData('record_date', e.target.value)} required /></div>
                                    <div><InputLabel value="Next Due" /><TextInput type="date" className="mt-1 block w-full" value={healthForm.data.next_due_date} onChange={(e) => healthForm.setData('next_due_date', e.target.value)} /></div>
                                    {healthForm.data.type === 'medication' && (
                                        <>
                                            <div>
                                                <InputLabel value="Medicine" />
                                                <select className="mt-1 w-full rounded-md border-gray-300" value={healthForm.data.medicine_id} onChange={(e) => healthForm.setData('medicine_id', e.target.value)}>
                                                    <option value="">Select</option>
                                                    {medicines
                                                        .filter((m) => Number(m.quantity) > 0)
                                                        .map((m) => <option key={m.id} value={m.id}>{m.name} ({categoryLabels[m.category] ?? 'Medicine'})</option>)}
                                                </select>
                                            </div>
                                            <div><InputLabel value="Dosage" /><TextInput className="mt-1 block w-full" value={healthForm.data.dosage} onChange={(e) => healthForm.setData('dosage', e.target.value)} /></div>
                                            <div>
                                                <InputLabel value="Quantity Used" />
                                                <TextInput
                                                    type="number"
                                                    min="1"
                                                    className="mt-1 block w-full"
                                                    value={healthForm.data.medication_quantity}
                                                    onChange={(e) => healthForm.setData('medication_quantity', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <textarea className="mt-3 w-full rounded-md border-gray-300 text-sm" placeholder="Notes" rows={2} value={healthForm.data.veterinarian_notes} onChange={(e) => healthForm.setData('veterinarian_notes', e.target.value)} />
                                <PrimaryButton className="mt-3" disabled={healthForm.processing}>Add Record</PrimaryButton>
                            </form>
                        )}
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 font-semibold">Checkup & Health History</h3>
                        {pet.health_records?.length === 0 ? (
                            <p className="text-sm text-gray-500">No health records yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {pet.health_records.map((r) => (
                                    <div key={r.id} className="flex items-start justify-between border-b pb-3 text-sm">
                                        <div>
                                            <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">{r.type}</span>
                                            <strong className="ms-2">{r.title}</strong>
                                            <p className="text-gray-500">{r.record_date} {r.next_due_date && `· Next due: ${r.next_due_date}`}</p>
                                            {r.medicine && (
                                                <p>
                                                    Medicine: {r.medicine.name}
                                                    {r.dosage && ` (${r.dosage})`}
                                                    {r.medication_quantity && ` · Qty: ${r.medication_quantity} ${r.medicine.unit ?? ''}`}
                                                </p>
                                            )}
                                            {r.veterinarian_notes && <p>{r.veterinarian_notes}</p>}
                                        </div>
                                        {can_manage_health_records && (
                                            <button onClick={() => confirm('Delete?') && router.delete(route('health-records.destroy', [pet.id, r.id]))} className="text-red-600 hover:underline">Delete</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
