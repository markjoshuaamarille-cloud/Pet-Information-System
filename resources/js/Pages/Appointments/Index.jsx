import { useState, useCallback, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import InputError from '@/Components/InputError';
import ListDisplayControls from '@/Components/ListDisplayControls';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import useListDisplayLimit from '@/hooks/useListDisplayLimit';
import { formatClinicDateTime } from '@/utils/formatDateTime';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import axios from 'axios';

const appointmentStatusStyles = {
    scheduled: 'bg-blue-50 text-blue-700 ring-blue-100',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    cancelled: 'bg-red-50 text-red-700 ring-red-100',
};

const formatAppointmentStatus = (status) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';

function ClinicPicker({ serviceType, clientLat, clientLng, hasLocation, selectedClinicId, onSelect }) {
    const [clinics, setClinics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const isGrooming = serviceType === 'grooming';

    useEffect(() => {
        setClinics([]);
        setSearched(false);
    }, [serviceType]);

    const search = useCallback(async () => {
        if (!serviceType) return;
        setLoading(true);
        try {
            const res = await axios.post(route('clinics.suggest'), {
                type: serviceType,
                lat: clientLat,
                lng: clientLng,
            });
            const results = Array.isArray(res.data) ? res.data : [];
            const matching = isGrooming
                ? results.filter((clinic) => clinic.has_grooming)
                : results.filter((clinic) => clinic.has_veterinary);
            setClinics(matching);
            setSearched(true);
        } catch {
            setClinics([]);
            setSearched(true);
        } finally {
            setLoading(false);
        }
    }, [serviceType, clientLat, clientLng, isGrooming]);

    return (
        <div className="mt-2 overflow-hidden rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-slate-50 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-indigo-100/80 bg-white/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-base font-semibold text-gray-900">
                        Select Clinic / Salon
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        {isGrooming
                            ? 'Find registered salons that offer grooming near you.'
                            : 'Find registered clinics that match your service near you.'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={search}
                    disabled={loading || !serviceType}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Searching…
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                            </svg>
                            Find Nearest
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-4 p-5">
                {!hasLocation && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                        </svg>
                        <p>
                            Your home address is not set.{' '}
                            <Link href={route('profile.edit')} className="font-medium underline underline-offset-2">
                                Update your profile
                            </Link>
                            {' '}to see distances from your location.
                        </p>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center gap-3 rounded-lg border border-dashed border-indigo-200 bg-white/80 px-4 py-10 text-sm text-gray-500">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                        Searching for nearby locations…
                    </div>
                )}

                {!loading && searched && clinics.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-white/80 px-4 py-10 text-center">
                        <p className="text-sm font-medium text-gray-700">No locations found</p>
                        <p className="mt-1 text-sm text-gray-500">
                            {isGrooming
                                ? 'No registered clinics or salons with grooming services were found for this search.'
                                : 'No matching registered clinics were found for this service type.'}
                        </p>
                    </div>
                )}

                {!loading && clinics.length > 0 && (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {clinics.map((clinic) => {
                            const isSelected = String(selectedClinicId) === String(clinic.id);

                            return (
                                <label
                                    key={clinic.id}
                                    className={`group flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                                        isSelected
                                            ? 'border-indigo-500 bg-white shadow-md ring-2 ring-indigo-500/20'
                                            : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="clinic_id"
                                        value={clinic.id}
                                        checked={isSelected}
                                        onChange={() => onSelect(clinic.id)}
                                        className="mt-1 h-5 w-5 shrink-0 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <p className="text-base font-semibold text-gray-900">
                                                {clinic.name}
                                            </p>
                                            {clinic.distance_formatted && (
                                                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                                    {clinic.distance_formatted}
                                                </span>
                                            )}
                                        </div>
                                        {clinic.address && (
                                            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                                                {clinic.address}
                                            </p>
                                        )}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {clinic.has_veterinary && (
                                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                    Veterinary
                                                </span>
                                            )}
                                            {clinic.has_pet_shop && (
                                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                    Pet Shop
                                                </span>
                                            )}
                                            {clinic.has_grooming && (
                                                <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                                                    Grooming
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                )}

                {!loading && !searched && clinics.length === 0 && (
                    <div className="rounded-lg border border-dashed border-indigo-200 bg-white/60 px-4 py-10 text-center">
                        <p className="text-sm font-medium text-gray-700">Ready to search</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Click <span className="font-medium text-indigo-700">Find Nearest</span> to see clinics and salons for your selected service.
                        </p>
                    </div>
                )}

                {selectedClinicId && (
                    <div className="flex justify-end border-t border-indigo-100/80 pt-4">
                        <button
                            type="button"
                            onClick={() => onSelect('')}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-800"
                        >
                            Clear selection
                        </button>
                    </div>
                )}
            </div>
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

        if (isCustomer && !form.data.clinic_id) {
            form.setError('clinic_id', 'Please select a clinic or salon.');
            return;
        }

        if (!isCustomer && !form.data.client_id) {
            form.setError('client_id', 'Please select a client.');
            return;
        }

        form.post(route('appointments.store'), {
            onSuccess: () => form.reset(),
        });
    };

    const onPetChange = (petId) => {
        form.setData('pet_id', petId);
        const pet = pets.find((p) => String(p.id) === petId);
        if (pet) form.setData('client_id', String(pet.client_id));
    };

    const onServiceTypeChange = (type) => {
        form.setData({
            ...form.data,
            type,
            clinic_id: '',
        });
        form.clearErrors('clinic_id');
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
                                <InputError className="mt-1" message={form.errors.scheduled_at} />
                            </div>
                            <div>
                                <InputLabel value="Service Type" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.type}
                                    onChange={(e) => onServiceTypeChange(e.target.value)}
                                    required
                                >
                                    {Object.entries(serviceTypes).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <InputError className="mt-1" message={form.errors.type} />
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
                                <InputError className="mt-1" message={form.errors.clinic_id} />
                            </div>
                        )}

                        {/* Staff client selector */}
                        {!isCustomer && (
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
                                    <InputError className="mt-1" message={form.errors.client_id} />
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
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${
                                                    appointmentStatusStyles[a.status] ??
                                                    'bg-gray-50 text-gray-700 ring-gray-100'
                                                }`}
                                            >
                                                {formatAppointmentStatus(a.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {can_manage_status && a.status === 'scheduled' && (
                                                <button
                                                    onClick={() => router.put(route('appointments.update', a.id), { ...a, status: 'completed' })}
                                                    className="text-green-600 hover:underline"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                            {a.status === 'scheduled' && (
                                                <button
                                                    onClick={() => confirm('Cancel this appointment?') && router.delete(route('appointments.destroy', a.id))}
                                                    className="ms-3 text-red-600 hover:underline"
                                                >
                                                    {can_manage_status ? 'Delete' : 'Cancel'}
                                                </button>
                                            )}
                                            {a.status === 'cancelled' && (
                                                <span className="text-xs text-gray-400">
                                                    Cancelled
                                                </span>
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
