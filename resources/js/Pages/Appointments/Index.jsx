import { useState, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import ListDisplayControls from '@/Components/ListDisplayControls';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import useListDisplayLimit from '@/hooks/useListDisplayLimit';
import { formatClinicDateTime } from '@/utils/formatDateTime';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import axios from 'axios';

function ClinicPicker({ serviceType, clientLat, clientLng, hasLocation, selectedClinicId, onSelect }) {
    const [clinics, setClinics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const search = useCallback(async () => {
        if (!serviceType) return;
        setLoading(true);
        try {
            const res = await axios.post(route('clinics.suggest'), {
                type: serviceType,
                lat: clientLat,
                lng: clientLng,
            });
            setClinics(res.data);
            setSearched(true);
        } catch {
            setClinics([]);
        } finally {
            setLoading(false);
        }
    }, [serviceType, clientLat, clientLng]);

    return (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-indigo-700">Select Clinic / Salon</p>
                <button
                    type="button"
                    onClick={search}
                    disabled={loading || !serviceType}
                    className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Searching…' : 'Find Nearest'}
                </button>
            </div>

            {!hasLocation && (
                <p className="mb-2 text-xs text-amber-700">
                    Your home address is not set.{' '}
                    <Link href={route('profile.edit')} className="underline">Update your profile</Link>
                    {' '}to see distances.
                </p>
            )}

            {searched && clinics.length === 0 && (
                <p className="text-xs text-gray-500">No matching registered clinics found for this service type.</p>
            )}

            <div className="mt-2 space-y-2 max-h-56 overflow-y-auto">
                {clinics.map(clinic => (
                    <label
                        key={clinic.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                            String(selectedClinicId) === String(clinic.id)
                                ? 'border-indigo-500 bg-white shadow-sm'
                                : 'border-gray-200 bg-white hover:border-indigo-300'
                        }`}
                    >
                        <input
                            type="radio"
                            name="clinic_id"
                            value={clinic.id}
                            checked={String(selectedClinicId) === String(clinic.id)}
                            onChange={() => onSelect(clinic.id)}
                            className="mt-0.5 h-4 w-4 text-indigo-600"
                        />
                        <div className="flex-1 text-xs">
                            <p className="font-medium text-gray-800">{clinic.name}</p>
                            {clinic.address && <p className="text-gray-500">{clinic.address}</p>}
                            <div className="mt-1 flex flex-wrap gap-1">
                                {clinic.has_veterinary && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">Vet</span>}
                                {clinic.has_pet_shop   && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">Pet Shop</span>}
                                {clinic.has_grooming   && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700">Grooming</span>}
                                {clinic.distance_formatted && (
                                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700 font-semibold">
                                        {clinic.distance_formatted}
                                    </span>
                                )}
                            </div>
                        </div>
                    </label>
                ))}
            </div>

            {selectedClinicId && (
                <button
                    type="button"
                    onClick={() => onSelect('')}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
                >
                    Clear selection
                </button>
            )}
        </div>
    );
}

export default function AppointmentsIndex({
    appointments,
    pets,
    clients,
    can_manage_status,
    serviceTypes,
    clientLat,
    clientLng,
    hasLocation,
}) {
    const appTimezone = usePage().props.appTimezone ?? 'Asia/Manila';
    const auth = usePage().props.auth;
    const isCustomer = auth?.user?.role === 'customer';

    const form = useForm({
        clinic_id:    '',
        pet_id:       '',
        client_id:    '',
        scheduled_at: '',
        type:         'checkup',
        status:       'scheduled',
        notes:        '',
    });

    const {
        visibleItems: visibleAppointments,
        displayLimit,
        setDisplayLimit,
        totalCount: appointmentListCount,
        showingCount: appointmentShowingCount,
    } = useListDisplayLimit(appointments);

    const submit = (e) => {
        e.preventDefault();
        form.post(route('appointments.store'), {
            onSuccess: () => form.reset(),
        });
    };

    const onPetChange = (petId) => {
        form.setData('pet_id', petId);
        const pet = pets.find((p) => String(p.id) === petId);
        if (pet) form.setData('client_id', String(pet.client_id));
    };

    const labelFor = (type) => serviceTypes?.[type] ?? type;

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
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.pet_id}
                                    onChange={(e) => onPetChange(e.target.value)}
                                    required
                                >
                                    <option value="">Select pet</option>
                                    {pets.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.pet_name} ({p.client?.name})
                                        </option>
                                    ))}
                                </select>
                                {form.errors.pet_id && <p className="mt-1 text-xs text-red-500">{form.errors.pet_id}</p>}
                            </div>
                            <div>
                                <InputLabel value="Date &amp; Time" />
                                <TextInput
                                    type="datetime-local"
                                    className="mt-1 block w-full"
                                    value={form.data.scheduled_at}
                                    onChange={(e) => form.setData('scheduled_at', e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Service Type" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.type}
                                    onChange={(e) => form.setData('type', e.target.value)}
                                >
                                    {Object.entries(serviceTypes).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Clinic picker — shown for customers */}
                        {isCustomer && (
                            <div className="mt-4">
                                <ClinicPicker
                                    serviceType={form.data.type}
                                    clientLat={clientLat}
                                    clientLng={clientLng}
                                    hasLocation={hasLocation}
                                    selectedClinicId={form.data.clinic_id}
                                    onSelect={(id) => form.setData('clinic_id', id)}
                                />
                                {form.errors.clinic_id && (
                                    <p className="mt-1 text-xs text-red-500">{form.errors.clinic_id}</p>
                                )}
                            </div>
                        )}

                        {/* Staff clinic selector */}
                        {!isCustomer && clients.length > 1 && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel value="Client" />
                                    <select
                                        className="mt-1 w-full rounded-md border-gray-300"
                                        value={form.data.client_id}
                                        onChange={(e) => form.setData('client_id', e.target.value)}
                                        required
                                    >
                                        <option value="">Select client</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <PrimaryButton className="mt-4" disabled={form.processing}>
                            Schedule
                        </PrimaryButton>
                    </form>

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Pet</th>
                                    <th className="px-4 py-3 text-left">Clinic</th>
                                    <th className="px-4 py-3 text-left">When</th>
                                    <th className="px-4 py-3 text-left">Service</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visibleAppointments.map((a) => (
                                    <tr key={a.id}>
                                        <td className="px-4 py-3">{a.pet?.pet_name}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {a.clinic?.name ?? <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatClinicDateTime(a.scheduled_at, appTimezone)}
                                        </td>
                                        <td className="px-4 py-3">{labelFor(a.type)}</td>
                                        <td className="px-4 py-3">{a.status}</td>
                                        <td className="px-4 py-3 text-right">
                                            {can_manage_status && a.status !== 'completed' && (
                                                <button
                                                    onClick={() => router.put(route('appointments.update', a.id), { ...a, status: 'completed' })}
                                                    className="text-green-600 hover:underline"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                            {a.status !== 'completed' && (
                                                <button
                                                    onClick={() => confirm('Cancel this appointment?') && router.delete(route('appointments.destroy', a.id))}
                                                    className="ms-3 text-red-600 hover:underline"
                                                >
                                                    {can_manage_status ? 'Delete' : 'Cancel'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <ListDisplayControls
                            totalCount={appointmentListCount}
                            showingCount={appointmentShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
