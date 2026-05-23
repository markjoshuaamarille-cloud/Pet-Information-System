import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

export default function ClientsIndex({ clients }) {
    const [editing, setEditing] = useState(null);
    const form = useForm({ name: '', contact: '', email: '', address: '' });

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            form.put(route('clients.update', editing), { onSuccess: () => { form.reset(); setEditing(null); } });
        } else {
            form.post(route('clients.store'), { onSuccess: () => form.reset() });
        }
    };

    const startEdit = (c) => {
        setEditing(c.id);
        form.setData({ name: c.name, contact: c.contact, email: c.email || '', address: c.address || '' });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Client Records</h2>}>
            <Head title="Clients" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <form onSubmit={submit} className="mb-6 rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 font-semibold">{editing ? 'Edit Client' : 'Register Client'}</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><InputLabel value="Name" /><TextInput className="mt-1 block w-full" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required /></div>
                            <div><InputLabel value="Contact" /><TextInput className="mt-1 block w-full" value={form.data.contact} onChange={(e) => form.setData('contact', e.target.value)} required /></div>
                            <div><InputLabel value="Email" /><TextInput type="email" className="mt-1 block w-full" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} /></div>
                            <div><InputLabel value="Address" /><TextInput className="mt-1 block w-full" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} /></div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <PrimaryButton disabled={form.processing}>{editing ? 'Update' : 'Save'}</PrimaryButton>
                            {editing && <button type="button" onClick={() => { setEditing(null); form.reset(); }} className="text-sm text-gray-600">Cancel</button>}
                        </div>
                    </form>
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Contact</th><th className="px-4 py-3 text-left">Pets</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                                {clients.map((c) => (
                                    <tr key={c.id}>
                                        <td className="px-4 py-3">{c.name}</td>
                                        <td className="px-4 py-3">{c.contact}</td>
                                        <td className="px-4 py-3">{c.pets_count}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => startEdit(c)} className="text-indigo-600 hover:underline">Edit</button>
                                            <button onClick={() => confirm('Delete?') && router.delete(route('clients.destroy', c.id))} className="ms-3 text-red-600 hover:underline">Delete</button>
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
