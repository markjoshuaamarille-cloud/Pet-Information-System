import { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import AddressLocationForm from '@/Components/AddressLocationForm';
import { emptyAddressForm } from '@/utils/address';

const STATUS_BADGE = {
    active:   'bg-green-100 text-green-700',
    pending:  'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-600',
};

const ALL_MODULES_LABELS = {
    dashboard: 'Dashboard', scheduling: 'Scheduling', vaccinations: 'Vaccinations',
    grooming: 'Grooming', pet_shop: 'Pet Shop', pet_shop_billing: 'Pet Shop Billing',
    inventory: 'Inventory', service_catalog: 'Service Catalog', pets: 'Pets',
    reports: 'Reports', notifications: 'Notifications', billing: 'Billing',
};

function FormField({ label, name, type = 'text', required, value, error, onChange }) {
    return (
        <div>
            <label htmlFor={name} className="block text-xs font-medium text-gray-600">
                {label}{required && ' *'}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={value ?? ''}
                onChange={onChange}
                required={required}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function ClinicForm({ initial = {}, allModules, onSubmit, onCancel, submitLabel = 'Save' }) {
    const form = useForm({
        name:               initial.name ?? '',
        contact:            initial.contact ?? '',
        email:              initial.email ?? '',
        website:            initial.website ?? '',
        has_veterinary:     initial.has_veterinary ?? false,
        has_pet_shop:       initial.has_pet_shop ?? false,
        has_grooming:       initial.has_grooming ?? false,
        enabled_modules:    initial.enabled_modules ?? [],
        ...emptyAddressForm(initial),
    });

    const handleGeoapifyImport = (imported) => {
        if (imported.name) {
            form.setData('name', imported.name);
        }
        if (imported.has_veterinary) {
            form.setData('has_veterinary', true);
        }
        if (imported.has_pet_shop) {
            form.setData('has_pet_shop', true);
        }
        if (imported.has_grooming) {
            form.setData('has_grooming', true);
        }
    };

    const toggleModule = (mod) => {
        const current = form.data.enabled_modules || [];
        form.setData('enabled_modules', current.includes(mod)
            ? current.filter(m => m !== mod)
            : [...current, mod]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Clinic / Shop Name" name="name" required value={form.data.name} error={form.errors.name} onChange={e => form.setData('name', e.target.value)} />
                <FormField label="Contact Number" name="contact" value={form.data.contact} error={form.errors.contact} onChange={e => form.setData('contact', e.target.value)} />
                <FormField label="Email" name="email" type="email" value={form.data.email} error={form.errors.email} onChange={e => form.setData('email', e.target.value)} />
                <FormField label="Website" name="website" type="url" value={form.data.website} error={form.errors.website} onChange={e => form.setData('website', e.target.value)} />
            </div>

            <AddressLocationForm
                data={form.data}
                setData={(updates) => {
                    if (typeof updates === 'function') {
                        form.setData(updates(form.data));
                    } else {
                        form.setData({ ...form.data, ...updates });
                    }
                }}
                errors={form.errors}
                geocodeRoute="nearby-places.geocode"
                reverseGeocodeRoute="nearby-places.reverse-geocode"
                geoapifyImportRoute="admin.clinics.geoapify-import"
                onGeoapifyImport={handleGeoapifyImport}
                requireCoordinates
            />

            {/* Service flags */}
            <div>
                <p className="mb-2 text-xs font-medium text-gray-600">Services Offered</p>
                <div className="flex flex-wrap gap-4">
                    {[
                        { key: 'has_veterinary', label: 'Veterinary Clinic' },
                        { key: 'has_pet_shop',   label: 'Pet Shop / Supplies' },
                        { key: 'has_grooming',   label: 'Grooming Salon' },
                    ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data[key]}
                                onChange={e => form.setData(key, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                            />
                            {label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Module toggles */}
            <div>
                <p className="mb-2 text-xs font-medium text-gray-600">Enabled Modules</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {allModules.map(mod => (
                        <label key={mod} className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={(form.data.enabled_modules || []).includes(mod)}
                                onChange={() => toggleModule(mod)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                            />
                            {ALL_MODULES_LABELS[mod] ?? mod}
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex gap-3">
                <button type="submit" disabled={form.processing} className="rounded bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                    {submitLabel}
                </button>
                <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    Cancel
                </button>
            </div>
        </form>
    );
}

function DeleteClinicModal({ clinic, onClose }) {
    const form = useForm({ password: '' });

    const submit = (e) => {
        e.preventDefault();
        form.delete(route('admin.clinics.destroy', clinic.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-800">Delete clinic</h3>
                <p className="mt-2 text-sm text-gray-600">
                    You are about to permanently delete{' '}
                    <span className="font-semibold text-gray-800">{clinic.name}</span>. This
                    action cannot be undone.
                </p>
                <form onSubmit={submit} className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="delete_clinic_password" className="block text-xs font-medium text-gray-600">
                            Confirm your super admin password *
                        </label>
                        <input
                            id="delete_clinic_password"
                            type="password"
                            autoFocus
                            autoComplete="current-password"
                            className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                        />
                        {form.errors.password && (
                            <p className="mt-1 text-xs text-red-500">{form.errors.password}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing || !form.data.password}
                            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                        >
                            {form.processing ? 'Deleting…' : 'Delete clinic'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ClinicsIndex({ clinics, allModules }) {
    const [mode, setMode] = useState(null); // null | 'create' | { edit: clinic }
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const visible = useMemo(() => {
        return clinics.filter(c => {
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [clinics, statusFilter, search]);

    const handleCreate = (form) => {
        form.post(route('admin.clinics.store'), {
            onSuccess: () => setMode(null),
        });
    };

    const handleUpdate = (clinic, form) => {
        form.put(route('admin.clinics.update', clinic.id), {
            onSuccess: () => setMode(null),
        });
    };

    const approve = (clinic) => {
        if (!confirm(`Approve "${clinic.name}"?`)) return;
        router.post(route('admin.clinics.approve', clinic.id));
    };

    const reject = (clinic) => {
        if (!confirm(`Reject "${clinic.name}"?`)) return;
        router.post(route('admin.clinics.reject', clinic.id));
    };

    const deactivate = (clinic) => {
        if (!confirm(`Deactivate "${clinic.name}"?\n\nThis clinic will no longer accept appointments, transactions, or any new activity until reactivated.`)) return;
        router.post(route('admin.clinics.deactivate', clinic.id));
    };

    const activate = (clinic) => {
        if (!confirm(`Reactivate "${clinic.name}"?\n\nThe clinic will be able to accept appointments and transactions again.`)) return;
        router.post(route('admin.clinics.activate', clinic.id));
    };

    const destroy = (clinic) => {
        setDeleteTarget(clinic);
    };

    const pendingCount = clinics.filter(c => c.status === 'pending').length;

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Clinic &amp; Shop Management</h2>}>
            <Head title="Clinics" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    {pendingCount > 0 && (
                        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                            {pendingCount} clinic registration{pendingCount > 1 ? 's' : ''} pending approval.
                        </div>
                    )}

                    {/* Header row */}
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <input
                            type="text"
                            placeholder="Search clinics..."
                            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <select
                            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <button
                            onClick={() => setMode('create')}
                            className="ml-auto rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            + Add Clinic
                        </button>
                    </div>

                    {/* Create form */}
                    {mode === 'create' && (
                        <div className="mb-6 rounded-lg bg-white p-6 shadow">
                            <h3 className="mb-4 font-semibold text-gray-800">New Clinic / Shop</h3>
                            <ClinicForm
                                allModules={allModules}
                                onSubmit={handleCreate}
                                onCancel={() => setMode(null)}
                                submitLabel="Create Clinic"
                            />
                        </div>
                    )}

                    {/* Clinics list */}
                    <div className="space-y-3">
                        {visible.map(clinic => (
                            <div key={clinic.id} className="rounded-lg bg-white p-5 shadow">
                                {mode?.edit?.id === clinic.id ? (
                                    <>
                                        <h3 className="mb-4 font-semibold text-gray-800">Edit: {clinic.name}</h3>
                                        <ClinicForm
                                            initial={clinic}
                                            allModules={allModules}
                                            onSubmit={(form) => handleUpdate(clinic, form)}
                                            onCancel={() => setMode(null)}
                                            submitLabel="Save Changes"
                                        />
                                    </>
                                ) : (
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-800">{clinic.name}</span>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[clinic.status]}`}>
                                                    {clinic.status}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">{clinic.address_formatted}</p>
                                            <div className="mt-1 flex gap-2 text-xs text-gray-400">
                                                {clinic.has_veterinary && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">Vet</span>}
                                                {clinic.has_pet_shop  && <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-600">Pet Shop</span>}
                                                {clinic.has_grooming  && <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-600">Grooming</span>}
                                            </div>
                                            {clinic.submitted_by && (
                                                <p className="mt-1 text-xs text-gray-400">Submitted by: {clinic.submitted_by.name}</p>
                                            )}
                                            {clinic.status === 'inactive' && (
                                                <p className="mt-2 text-xs text-gray-500">
                                                    Deactivated — no new appointments or transactions are allowed.
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {clinic.status === 'pending' && (
                                                <>
                                                    <button onClick={() => approve(clinic)} className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700">Approve</button>
                                                    <button onClick={() => reject(clinic)} className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600">Reject</button>
                                                </>
                                            )}
                                            {clinic.status === 'active' && (
                                                <button
                                                    onClick={() => deactivate(clinic)}
                                                    className="rounded border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                                                >
                                                    Deactivate
                                                </button>
                                            )}
                                            {clinic.status === 'inactive' && (
                                                <button
                                                    onClick={() => activate(clinic)}
                                                    className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                                                >
                                                    Reactivate
                                                </button>
                                            )}
                                            <button onClick={() => setMode({ edit: clinic })} className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">Edit</button>
                                            <button onClick={() => destroy(clinic)} className="rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {visible.length === 0 && (
                            <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow">
                                No clinics found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {deleteTarget && (
                <DeleteClinicModal
                    clinic={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}
