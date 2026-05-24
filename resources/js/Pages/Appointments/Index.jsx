import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { Head, useForm, router } from '@inertiajs/react';

export default function AppointmentsIndex({ appointments, pets, clients, can_manage_status }) {
    const form = useForm({
        pet_id: '', client_id: '', scheduled_at: '', type: 'checkup', status: 'scheduled', notes: '',
    });

    const submit = (e) => {
        e.preventDefault();
        form.post(route('appointments.store'), { onSuccess: () => form.reset() });
    };

    const onPetChange = (petId) => {
        form.setData('pet_id', petId);
        const pet = pets.find((p) => String(p.id) === petId);
        if (pet) form.setData('client_id', String(pet.client_id));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Scheduling</h2>}>
            <Head title="Appointments" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <form onSubmit={submit} className="mb-6 rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 font-semibold">Schedule Appointment</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <InputLabel value="Pet" />
                                <select className="mt-1 w-full rounded-md border-gray-300" value={form.data.pet_id} onChange={(e) => onPetChange(e.target.value)} required>
                                    <option value="">Select pet</option>
                                    {pets.map((p) => <option key={p.id} value={p.id}>{p.pet_name} ({p.client?.name})</option>)}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Date & Time" />
                                <TextInput type="datetime-local" className="mt-1 block w-full" value={form.data.scheduled_at} onChange={(e) => form.setData('scheduled_at', e.target.value)} required />
                            </div>
                            <div>
                                <InputLabel value="Type" />
                                <select className="mt-1 w-full rounded-md border-gray-300" value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}>
                                    {['checkup', 'vaccination', 'grooming', 'consultation', 'other'].map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <PrimaryButton className="mt-4" disabled={form.processing}>Schedule</PrimaryButton>
                    </form>
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Pet</th><th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">When</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                                {appointments.map((a) => (
                                    <tr key={a.id}>
                                        <td className="px-4 py-3">{a.pet?.pet_name}</td>
                                        <td className="px-4 py-3">{a.client?.name}</td>
                                        <td className="px-4 py-3">{new Date(a.scheduled_at).toLocaleString()}</td>
                                        <td className="px-4 py-3">{a.type}</td>
                                        <td className="px-4 py-3">{a.status}</td>
                                        <td className="px-4 py-3 text-right">
                                            {can_manage_status && a.status !== 'completed' && (
                                                <button onClick={() => router.put(route('appointments.update', a.id), { ...a, status: 'completed' })} className="text-green-600 hover:underline">Complete</button>
                                            )}
                                            {a.status !== 'completed' && (
                                                <button onClick={() => confirm('Cancel?') && router.delete(route('appointments.destroy', a.id))} className="ms-3 text-red-600 hover:underline">{can_manage_status ? 'Delete' : 'Cancel'}</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
