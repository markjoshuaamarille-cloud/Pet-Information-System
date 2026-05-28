import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import ImageLightbox from "@/Components/ImageLightbox";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";

const vaccinationStatusOptions = [
    { value: "unknown", label: "Unknown" },
    { value: "up_to_date", label: "Up to Date" },
    { value: "partial", label: "Partial" },
    { value: "not_vaccinated", label: "Not Vaccinated" },
];

export default function PetsIndex({
    pets,
    clients,
    can_manage_records = true,
}) {
    const user = usePage().props.auth.user;
    const isCustomer = user?.role === "customer";
    const [editingId, setEditingId] = useState(null);
    const initialFormData = {
        client_id: "",
        pet_name: "",
        species: "",
        breed: "",
        age: "",
        gender: "",
        birth_date: "",
        weight: "",
        color: "",
        microchip_no: "",
        vaccination_status: "unknown",
        medical_history: "",
        photo: null,
    };
    const form = useForm(initialFormData);

    const submit = (e) => {
        e.preventDefault();

        const submitOptions = {
            preserveScroll: true,
            onSuccess: () => {
                form.transform((data) => data);
                form.reset();
                setEditingId(null);
            },
            onFinish: () => form.transform((data) => data),
        };

        const hasPhoto = form.data.photo instanceof File;

        // PHP does not parse multipart bodies on PUT; use POST + _method when uploading files.
        if (hasPhoto) {
            form.transform((data) => ({
                ...data,
                ...(editingId ? { _method: "put" } : {}),
            }));
            form.post(
                editingId
                    ? route("pets.update", editingId)
                    : route("pets.store"),
                {
                    ...submitOptions,
                    forceFormData: true,
                },
            );
            return;
        }

        form.transform(({ photo, ...data }) => data);

        if (editingId) {
            form.put(route("pets.update", editingId), submitOptions);
            return;
        }

        form.post(route("pets.store"), submitOptions);
    };

    const startEdit = (pet) => {
        setEditingId(pet.id);
        form.setData({
            client_id: pet.client_id ? String(pet.client_id) : "",
            pet_name: pet.pet_name ?? "",
            species: pet.species ?? "",
            breed: pet.breed ?? "",
            age: pet.age ?? "",
            gender: pet.gender ?? "",
            birth_date: pet.birth_date
                ? String(pet.birth_date).slice(0, 10)
                : "",
            weight: pet.weight ?? "",
            color: pet.color ?? "",
            microchip_no: pet.microchip_no ?? "",
            vaccination_status: pet.vaccination_status ?? "unknown",
            medical_history: pet.medical_history ?? "",
            photo: null,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        form.setData(initialFormData);
        form.clearErrors();
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Pet Records
                </h2>
            }
        >
            <Head title="Pets" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    {can_manage_records && (
                        <form
                            onSubmit={submit}
                            className="mb-6 rounded-lg bg-white p-6 shadow"
                        >
                            <h3 className="mb-4 font-semibold">
                                {editingId ? "Edit Pet Record" : "Register Pet"}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-3">
                                {!isCustomer && (
                                    <div>
                                        <InputLabel value="Client" />
                                        <select
                                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                            value={form.data.client_id}
                                            onChange={(e) =>
                                                form.setData(
                                                    "client_id",
                                                    e.target.value,
                                                )
                                            }
                                            required
                                        >
                                            <option value="">
                                                Select client
                                            </option>
                                            {clients.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <InputLabel value="Pet Name" />
                                    <TextInput
                                        className="mt-1 block w-full"
                                        value={form.data.pet_name}
                                        onChange={(e) =>
                                            form.setData(
                                                "pet_name",
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError
                                        message={form.errors.pet_name}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Species" />
                                    <TextInput
                                        className="mt-1 block w-full"
                                        value={form.data.species}
                                        onChange={(e) =>
                                            form.setData(
                                                "species",
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError
                                        message={form.errors.species}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Breed" />
                                    <TextInput
                                        className="mt-1 block w-full"
                                        value={form.data.breed}
                                        onChange={(e) =>
                                            form.setData(
                                                "breed",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Age" />
                                    <TextInput
                                        type="number"
                                        className="mt-1 block w-full"
                                        value={form.data.age}
                                        onChange={(e) =>
                                            form.setData("age", e.target.value)
                                        }
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Gender" />
                                    <TextInput
                                        className="mt-1 block w-full"
                                        value={form.data.gender}
                                        onChange={(e) =>
                                            form.setData(
                                                "gender",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Birth Date" />
                                    <TextInput
                                        type="date"
                                        className="mt-1 block w-full"
                                        value={form.data.birth_date}
                                        onChange={(e) =>
                                            form.setData(
                                                "birth_date",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Weight (kg)" />
                                    <TextInput
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="mt-1 block w-full"
                                        value={form.data.weight}
                                        onChange={(e) =>
                                            form.setData(
                                                "weight",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Color" />
                                    <TextInput
                                        className="mt-1 block w-full"
                                        value={form.data.color}
                                        onChange={(e) =>
                                            form.setData(
                                                "color",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Microchip No" />
                                    <TextInput
                                        className="mt-1 block w-full"
                                        value={form.data.microchip_no}
                                        onChange={(e) =>
                                            form.setData(
                                                "microchip_no",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Vaccination Status" />
                                    <select
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                        value={form.data.vaccination_status}
                                        onChange={(e) =>
                                            form.setData(
                                                "vaccination_status",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        {vaccinationStatusOptions.map(
                                            (option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <InputLabel value="Pet Photo (optional)" />
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        onChange={(e) =>
                                            form.setData(
                                                "photo",
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.photo}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <InputLabel value="Medical History Notes" />
                                <textarea
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    rows={2}
                                    value={form.data.medical_history}
                                    onChange={(e) =>
                                        form.setData(
                                            "medical_history",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                                <PrimaryButton disabled={form.processing}>
                                    {form.processing
                                        ? editingId
                                            ? "Updating…"
                                            : "Saving…"
                                        : editingId
                                          ? "Update Pet"
                                          : "Save Pet"}
                                </PrimaryButton>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                    {!can_manage_records && (
                        <p className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                            View-only access. Review pet records here when
                            preparing billing.
                        </p>
                    )}
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        Photo
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Species
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Microchip
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Vaccination
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Owner
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {pets.map((p) => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-3">
                                            {p.photo_url ? (
                                                <ImageLightbox
                                                    src={p.photo_url}
                                                    alt={p.pet_name}
                                                    title={`${p.pet_name} — Pet Photo`}
                                                    className="h-10 w-10 rounded object-cover"
                                                    hint="View photo"
                                                />
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    No photo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.pet_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.species}
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.microchip_no || "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {vaccinationStatusOptions.find(
                                                (option) =>
                                                    option.value ===
                                                    p.vaccination_status,
                                            )?.label ?? "Unknown"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.client?.name}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={route("pets.show", p.id)}
                                                className="text-indigo-600 hover:underline"
                                            >
                                                View
                                            </Link>
                                            {can_manage_records && (
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(p)}
                                                    className="ms-3 text-amber-600 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            <Link
                                                href={route(
                                                    "pets.client-record",
                                                    p.id,
                                                )}
                                                className="ms-3 text-green-600 hover:underline"
                                            >
                                                Client Record
                                            </Link>
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
