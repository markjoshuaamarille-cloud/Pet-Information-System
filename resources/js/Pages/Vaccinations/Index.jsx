import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

const statuses = ['scheduled', 'completed', 'missed'];

export default function VaccinationsIndex({ vaccinations, pets, vaccinationAppointments, vaccines }) {
    const [editing, setEditing] = useState(null);
    const form = useForm({
        pet_id: '',
        appointment_id: '',
        medicine_id: '',
        dose: '',
        quantity_used: '1',
        administered_on: '',
        next_due_date: '',
        status: 'completed',
        notes: '',
    });

    const submit = (e) => {
        e.preventDefault();

        if (editing) {
            form.put(route('vaccinations.update', editing), {
                onSuccess: () => {
                    resetForm();
                },
            });
            return;
        }

        form.post(route('vaccinations.store'), {
            onSuccess: () => {
                resetForm();
            },
        });
    };

    const resetForm = () => {
        form.reset();
        form.setData('quantity_used', '1');
        form.setData('status', 'completed');
        setEditing(null);
    };

    const startEdit = (record) => {
        setEditing(record.id);
        form.setData({
            pet_id: String(record.pet_id),
            appointment_id: record.appointment_id ? String(record.appointment_id) : '',
            medicine_id: record.medicine_id ? String(record.medicine_id) : '',
            dose: record.dose || '',
            quantity_used: String(record.quantity_used ?? 1),
            administered_on: record.administered_on?.slice(0, 10) || '',
            next_due_date: record.next_due_date?.slice(0, 10) || '',
            status: record.status,
            notes: record.notes || '',
        });
    };

    const onAppointmentChange = (appointmentId) => {
        form.setData('appointment_id', appointmentId);

        if (!appointmentId) {
            return;
        }

        const selected = vaccinationAppointments.find((appt) => String(appt.id) === appointmentId);
        if (selected) {
            form.setData('pet_id', String(selected.pet_id));
        }
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Vaccination Management</h2>}>
            <Head title="Vaccinations" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <form onSubmit={submit} className="mb-6 rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 font-semibold">{editing ? 'Edit Vaccination Record' : 'Add Vaccination Record'}</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <InputLabel value="Vaccination Appointment (optional)" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.appointment_id}
                                    onChange={(e) => onAppointmentChange(e.target.value)}
                                >
                                    <option value="">No linked appointment</option>
                                    {vaccinationAppointments.map((appt) => (
                                        <option key={appt.id} value={appt.id}>
                                            {appt.pet?.pet_name} ({appt.client?.name}) - {new Date(appt.scheduled_at).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Pet" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.pet_id}
                                    onChange={(e) => form.setData('pet_id', e.target.value)}
                                    required
                                >
                                    <option value="">Select pet</option>
                                    {pets.map((pet) => (
                                        <option key={pet.id} value={pet.id}>
                                            {pet.pet_name} ({pet.client?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Vaccine (from Inventory)" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.medicine_id}
                                    onChange={(e) => form.setData('medicine_id', e.target.value)}
                                    required
                                >
                                    <option value="">Select vaccine</option>
                                    {vaccines.map((vaccine) => (
                                        <option key={vaccine.id} value={vaccine.id}>
                                            {vaccine.name} ({vaccine.quantity} {vaccine.unit} available)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Dose" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.dose}
                                    onChange={(e) => form.setData('dose', e.target.value)}
                                    placeholder="e.g. 1 mL"
                                />
                            </div>
                            <div>
                                <InputLabel value="Quantity Used" />
                                <TextInput
                                    type="number"
                                    min="1"
                                    className="mt-1 block w-full"
                                    value={form.data.quantity_used}
                                    onChange={(e) => form.setData('quantity_used', e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Administered On" />
                                <TextInput
                                    type="date"
                                    className="mt-1 block w-full"
                                    value={form.data.administered_on}
                                    onChange={(e) => form.setData('administered_on', e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Next Due Date" />
                                <TextInput
                                    type="date"
                                    className="mt-1 block w-full"
                                    value={form.data.next_due_date}
                                    onChange={(e) => form.setData('next_due_date', e.target.value)}
                                />
                            </div>
                            <div>
                                <InputLabel value="Status" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.status}
                                    onChange={(e) => form.setData('status', e.target.value)}
                                >
                                    {statuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <InputLabel value="Notes" />
                                <textarea
                                    className="mt-1 block w-full rounded-md border-gray-300"
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <PrimaryButton disabled={form.processing}>Save</PrimaryButton>
                            {editing && (
                                <button
                                    type="button"
                                    className="text-sm text-gray-600 hover:underline"
                                    onClick={resetForm}
                                >
                                    Cancel edit
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Pet</th>
                                    <th className="px-4 py-3 text-left">Vaccine</th>
                                    <th className="px-4 py-3 text-left">Qty Used</th>
                                    <th className="px-4 py-3 text-left">Dose</th>
                                    <th className="px-4 py-3 text-left">Given</th>
                                    <th className="px-4 py-3 text-left">Next Due</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {vaccinations.map((record) => (
                                    <tr key={record.id}>
                                        <td className="px-4 py-3">{record.pet?.pet_name}</td>
                                        <td className="px-4 py-3">{record.medicine?.name ?? record.vaccine_name}</td>
                                        <td className="px-4 py-3">{record.quantity_used ?? 1}</td>
                                        <td className="px-4 py-3">{record.dose || '-'}</td>
                                        <td className="px-4 py-3">{record.administered_on?.slice(0, 10)}</td>
                                        <td className="px-4 py-3">{record.next_due_date?.slice(0, 10) || '-'}</td>
                                        <td className="px-4 py-3 capitalize">{record.status}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => startEdit(record)} className="text-indigo-600 hover:underline">
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => confirm('Delete vaccination record?') && router.delete(route('vaccinations.destroy', record.id))}
                                                className="ms-3 text-red-600 hover:underline"
                                            >
                                                Delete
                                            </button>
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
