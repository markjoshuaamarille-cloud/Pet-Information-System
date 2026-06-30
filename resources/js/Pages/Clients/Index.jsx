import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import ListDisplayControls from '@/Components/ListDisplayControls';
import useListDisplayLimit from '@/hooks/useListDisplayLimit';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import axios from 'axios';

function resolveClientPets(clients, client) {
    const source = clients.find((row) => row.id === client.id) ?? client;
    return Array.isArray(source.pets) ? source.pets : [];
}

export default function ClientsIndex({ clients }) {
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [petsFilter, setPetsFilter] = useState('');
    const [petsModalClient, setPetsModalClient] = useState(null);
    const [petsModalList, setPetsModalList] = useState([]);
    const [petsModalLoading, setPetsModalLoading] = useState(false);
    const form = useForm({ name: '', contact: '', email: '', address: '' });

    const filteredClients = useMemo(() => {
        const query = search.trim().toLowerCase();

        return clients.filter((client) => {
            if (petsFilter === 'with_pets' && (client.pets_count ?? 0) === 0) {
                return false;
            }

            if (petsFilter === 'no_pets' && (client.pets_count ?? 0) > 0) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [
                client.name,
                client.contact,
                client.email,
                client.address,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [clients, search, petsFilter]);

    const {
        visibleItems: visibleClients,
        displayLimit,
        setDisplayLimit,
        totalCount: clientListCount,
        showingCount: clientShowingCount,
    } = useListDisplayLimit(filteredClients);

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            form.put(route('clients.update', editing), {
                onSuccess: () => {
                    form.reset();
                    setEditing(null);
                },
            });
        } else {
            form.post(route('clients.store'), { onSuccess: () => form.reset() });
        }
    };

    const startEdit = (c) => {
        setEditing(c.id);
        form.setData({
            name: c.name,
            contact: c.contact,
            email: c.email || '',
            address: c.address || '',
        });
    };

    const clearFilters = () => {
        setSearch('');
        setPetsFilter('');
    };

    const hasActiveFilters = Boolean(search.trim() || petsFilter);

    const openPetsModal = async (client) => {
        setPetsModalClient(client);

        const inlinePets = resolveClientPets(clients, client);
        if (inlinePets.length > 0) {
            setPetsModalList(inlinePets);
            setPetsModalLoading(false);
            return;
        }

        setPetsModalList([]);
        setPetsModalLoading(true);

        try {
            const { data } = await axios.get(route('clients.pets', client.id));
            setPetsModalList(Array.isArray(data.pets) ? data.pets : []);
        } catch {
            setPetsModalList([]);
        } finally {
            setPetsModalLoading(false);
        }
    };

    const closePetsModal = () => {
        setPetsModalClient(null);
        setPetsModalList([]);
        setPetsModalLoading(false);
    };

    const petsModalCount =
        petsModalList.length > 0
            ? petsModalList.length
            : (petsModalClient?.pets_count ?? 0);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Client Records
                </h2>
            }
        >
            <Head title="Clients" />
            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <form
                        onSubmit={submit}
                        className="mb-6 rounded-lg bg-white p-6 shadow"
                    >
                        <h3 className="mb-4 font-semibold">
                            {editing ? 'Edit Client' : 'Register Client'}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel value="Name" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.name}
                                    onChange={(e) =>
                                        form.setData('name', e.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Contact" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.contact}
                                    onChange={(e) =>
                                        form.setData('contact', e.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Email" />
                                <TextInput
                                    type="email"
                                    className="mt-1 block w-full"
                                    value={form.data.email}
                                    onChange={(e) =>
                                        form.setData('email', e.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <InputLabel value="Address" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.address}
                                    onChange={(e) =>
                                        form.setData('address', e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <PrimaryButton disabled={form.processing}>
                                {editing ? 'Update' : 'Save'}
                            </PrimaryButton>
                            {editing && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing(null);
                                        form.reset();
                                    }}
                                    className="text-sm text-gray-600"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="mb-4 rounded-lg bg-white p-4 shadow">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <InputLabel value="Search" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Name, contact, email, address…"
                                />
                            </div>
                            <div>
                                <InputLabel value="Pets" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                    value={petsFilter}
                                    onChange={(e) => setPetsFilter(e.target.value)}
                                >
                                    <option value="">All clients</option>
                                    <option value="with_pets">With pets</option>
                                    <option value="no_pets">No pets</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                            <span>
                                Showing {filteredClients.length} of {clients.length}{' '}
                                client{clients.length === 1 ? '' : 's'}
                            </span>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="font-medium text-indigo-600 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            Name
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            Contact
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            Email
                                        </th>
                                        <th className="px-4 py-3 text-left">
                                            Pets
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {visibleClients.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-8 text-center text-gray-500"
                                            >
                                                No clients match your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleClients.map((c) => (
                                            <tr key={c.id}>
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {c.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {c.contact}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {c.email || '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {(c.pets_count ?? 0) > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openPetsModal(c)
                                                            }
                                                            className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100 transition hover:bg-indigo-100"
                                                            title="View pets"
                                                        >
                                                            {c.pets_count}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400">
                                                            0
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() =>
                                                            startEdit(c)
                                                        }
                                                        className="text-indigo-600 hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            confirm('Delete?') &&
                                                            router.delete(
                                                                route(
                                                                    'clients.destroy',
                                                                    c.id,
                                                                ),
                                                            )
                                                        }
                                                        className="ms-3 text-red-600 hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <ListDisplayControls
                            totalCount={clientListCount}
                            showingCount={clientShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>
                </div>
            </div>

            <Modal
                show={petsModalClient !== null}
                onClose={closePetsModal}
                maxWidth="lg"
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Pets — {petsModalClient?.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {petsModalLoading
                            ? 'Loading pets…'
                            : `${petsModalCount} registered pet${petsModalCount === 1 ? '' : 's'}`}
                    </p>

                    {petsModalLoading ? (
                        <p className="mt-4 text-sm text-gray-500">Please wait…</p>
                    ) : petsModalList.length ? (
                        <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
                            {petsModalList.map((pet) => (
                                <li
                                    key={pet.id}
                                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {pet.pet_name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {[pet.species, pet.breed]
                                                .filter(Boolean)
                                                .join(' · ') || '—'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {pet.is_active === false ? (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                Deactivated
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                                Active
                                            </span>
                                        )}
                                        <Link
                                            href={route('pets.show', pet.id)}
                                            className="text-sm font-medium text-indigo-600 hover:underline"
                                        >
                                            View record
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-4 text-sm text-gray-500">
                            No pets registered for this client.
                        </p>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={closePetsModal}
                            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
