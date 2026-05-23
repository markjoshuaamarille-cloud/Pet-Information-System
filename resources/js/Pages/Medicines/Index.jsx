import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

const statusBadge = {
    expired: 'bg-red-100 text-red-800',
    critical: 'bg-orange-100 text-orange-800',
    expiring_soon: 'bg-amber-100 text-amber-800',
    ok: 'bg-green-100 text-green-800',
};

const categories = [
    { value: 'medicine', label: 'Medicine' },
    { value: 'vaccine', label: 'Vaccine' },
    { value: 'supplement_vitamin', label: 'Supplement / Vitamin' },
    { value: 'consumable_supply', label: 'Consumable / Supply' },
    { value: 'parasite_control', label: 'Parasite Control' },
    { value: 'grooming_hygiene', label: 'Grooming / Hygiene' },
    { value: 'pet_food', label: 'Pet Food' },
];

const units = ['pcs', 'bottle', 'vial', 'tablet', 'capsule', 'pack', 'box', 'ml', 'g', 'kg'];

export default function MedicinesIndex({ medicines }) {
    const [editing, setEditing] = useState(null);
    const form = useForm({ name: '', category: 'medicine', description: '', quantity: 0, unit: 'pcs', expiry_date: '', reorder_level: 10 });

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            form.put(route('medicines.update', editing), { onSuccess: () => { form.reset(); setEditing(null); } });
        } else {
            form.post(route('medicines.store'), { onSuccess: () => form.reset() });
        }
    };

    const startEdit = (m) => {
        setEditing(m.id);
        form.setData({
            name: m.name,
            category: m.category ?? 'medicine',
            description: m.description || '',
            quantity: m.quantity,
            unit: m.unit,
            expiry_date: m.expiry_date?.slice(0, 10),
            reorder_level: m.reorder_level,
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Medicine Inventory</h2>}>
            <Head title="Inventory" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <form onSubmit={submit} className="mb-6 rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 font-semibold">{editing ? 'Edit Medicine' : 'Add Medicine'}</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div><InputLabel value="Name" /><TextInput className="mt-1 block w-full" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required /></div>
                            <div>
                                <InputLabel value="Category" />
                                <select className="mt-1 w-full rounded-md border-gray-300" value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} required>
                                    {categories.map((category) => (
                                        <option key={category.value} value={category.value}>{category.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div><InputLabel value="Quantity" /><TextInput type="number" className="mt-1 block w-full" value={form.data.quantity} onChange={(e) => form.setData('quantity', e.target.value)} required /></div>
                            <div>
                                <InputLabel value="Unit" />
                                <select className="mt-1 w-full rounded-md border-gray-300" value={form.data.unit} onChange={(e) => form.setData('unit', e.target.value)} required>
                                    {units.map((unit) => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            </div>
                            <div><InputLabel value="Expiry Date" /><TextInput type="date" className="mt-1 block w-full" value={form.data.expiry_date} onChange={(e) => form.setData('expiry_date', e.target.value)} required /></div>
                            <div><InputLabel value="Reorder Level (Critical)" /><TextInput type="number" className="mt-1 block w-full" value={form.data.reorder_level} onChange={(e) => form.setData('reorder_level', e.target.value)} required /></div>
                        </div>
                        <PrimaryButton className="mt-4" disabled={form.processing}>Save</PrimaryButton>
                    </form>
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Qty</th><th className="px-4 py-3 text-left">Unit</th><th className="px-4 py-3 text-left">Expiry</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                                {medicines.map((m) => (
                                    <tr key={m.id}>
                                        <td className="px-4 py-3">{m.name}</td>
                                        <td className="px-4 py-3">{categories.find((category) => category.value === m.category)?.label ?? 'Medicine'}</td>
                                        <td className="px-4 py-3">{m.quantity}</td>
                                        <td className="px-4 py-3">{m.unit}</td>
                                        <td className="px-4 py-3">{m.expiry_date?.slice(0, 10)}</td>
                                        <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${statusBadge[m.stock_status]}`}>{m.stock_status.replace('_', ' ')}</span></td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => startEdit(m)} className="text-indigo-600 hover:underline">Edit</button>
                                            <button onClick={() => confirm('Delete?') && router.delete(route('medicines.destroy', m.id))} className="ms-3 text-red-600 hover:underline">Delete</button>
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
