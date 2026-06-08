import { Head, useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import AddressLocationForm from '@/Components/AddressLocationForm';
import { emptyAddressForm } from '@/utils/address';

const ALL_MODULES_LABELS = {
    dashboard: 'Dashboard', scheduling: 'Scheduling', vaccinations: 'Vaccinations',
    grooming: 'Grooming', pet_shop: 'Pet Shop', pet_shop_billing: 'Pet Shop Billing',
    inventory: 'Inventory', service_catalog: 'Service Catalog', pets: 'Pets',
    reports: 'Reports', notifications: 'Notifications', survey: 'Survey', billing: 'Billing',
};

export default function ClinicRegister({ allModules }) {
    const form = useForm({
        name: '',
        contact: '',
        email: '',
        website: '',
        has_veterinary: false,
        has_pet_shop: false,
        has_grooming: false,
        ...emptyAddressForm(),
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

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('clinic-registration.store'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Register Your Clinic / Shop</h2>}>
            <Head title="Register Clinic" />
            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
                        Submit your clinic or pet shop for registration. An admin will review and activate your listing.
                        Once approved, customers nearby will be able to find and book appointments with you.
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[
                                    { label: 'Clinic / Shop Name *', key: 'name', required: true },
                                    { label: 'Contact Number', key: 'contact' },
                                    { label: 'Email', key: 'email', type: 'email' },
                                    { label: 'Website', key: 'website', type: 'url' },
                                ].map(({ label, key, type = 'text', required }) => (
                                    <div key={key}>
                                        <label className="block text-xs font-medium text-gray-600">{label}</label>
                                        <input
                                            type={type}
                                            required={required}
                                            className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                                            value={form.data[key]}
                                            onChange={e => form.setData(key, e.target.value)}
                                        />
                                        {form.errors[key] && <p className="mt-1 text-xs text-red-500">{form.errors[key]}</p>}
                                    </div>
                                ))}
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
                                geoapifyImportRoute="clinic-registration.geoapify-import"
                                onGeoapifyImport={handleGeoapifyImport}
                                requireCoordinates
                            />

                            <div>
                                <p className="mb-2 text-xs font-medium text-gray-600">What services does your establishment offer?</p>
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

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {form.processing ? 'Submitting…' : 'Submit Registration'}
                                </button>
                                <Link href={route('dashboard')} className="rounded border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50">
                                    Cancel
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
