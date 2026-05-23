import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { Head, Link, useForm, router } from '@inertiajs/react';

export default function PetsIndex({ pets, clients }) {
    const form = useForm({
        client_id: '', pet_name: '', species: '', breed: '', age: '', gender: '', medical_history: '',
    });

    const submit = (e) => {
        e.preventDefault();
        form.post(route('pets.store'), { onSuccess: () => form.reset() });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Pet Records</h2>}>
            <Head title="Pets" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <form onSubmit={submit} className="mb-6 rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 font-semibold">Register Pet</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <InputLabel value="Client" />
                                <select className="mt-1 w-full rounded-md border-gray-300 shadow-sm" value={form.data.client_id} onChange={(e) => form.setData('client_id', e.target.value)} required>
                                    <option value="">Select client</option>
                                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div><InputLabel value="Pet Name" /><TextInput className="mt-1 block w-full" value={form.data.pet_name} onChange={(e) => form.setData('pet_name', e.target.value)} required /></div>
                            <div><InputLabel value="Species" /><TextInput className="mt-1 block w-full" value={form.data.species} onChange={(e) => form.setData('species', e.target.value)} required /></div>
                            <div><InputLabel value="Breed" /><TextInput className="mt-1 block w-full" value={form.data.breed} onChange={(e) => form.setData('breed', e.target.value)} /></div>
                            <div><InputLabel value="Age" /><TextInput type="number" className="mt-1 block w-full" value={form.data.age} onChange={(e) => form.setData('age', e.target.value)} /></div>
                            <div><InputLabel value="Gender" /><TextInput className="mt-1 block w-full" value={form.data.gender} onChange={(e) => form.setData('gender', e.target.value)} /></div>
                        </div>
                        <div className="mt-4"><InputLabel value="Medical History Notes" /><textarea className="mt-1 w-full rounded-md border-gray-300" rows={2} value={form.data.medical_history} onChange={(e) => form.setData('medical_history', e.target.value)} /></div>
                        <PrimaryButton className="mt-4" disabled={form.processing}>Save Pet</PrimaryButton>
                    </form>
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Species</th><th className="px-4 py-3 text-left">Owner</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                                {pets.map((p) => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-3">{p.pet_name}</td>
                                        <td className="px-4 py-3">{p.species}</td>
                                        <td className="px-4 py-3">{p.client?.name}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={route('pets.show', p.id)} className="text-indigo-600 hover:underline">View</Link>
                                            <Link href={route('pets.client-record', p.id)} className="ms-3 text-green-600 hover:underline">Client Record</Link>
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
