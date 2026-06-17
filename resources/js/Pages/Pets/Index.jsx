import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import ImageLightbox from "@/Components/ImageLightbox";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import { clinicScopeSubtitle, clinicScopeTitle } from "@/utils/clinicScope";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";

const OTHERS_VALUE = "__others__";

const speciesOptions = [
    "Dog",
    "Cat",
    "Rabbit",
    "Hamster",
    "Guinea Pig",
    "Bird",
    "Reptile",
    "Turtle",
    "Fish",
];

const breedOptionsBySpecies = {
    Dog: [
        "Aspin",
        "Shih Tzu",
        "Pomeranian",
        "Labrador Retriever",
        "Golden Retriever",
        "German Shepherd",
        "Poodle",
        "Beagle",
        "Siberian Husky",
        "Chihuahua",
        "Cocker Spaniel",
        "Bulldog",
    ],
    Cat: [
        "Persian",
        "Siamese",
        "British Shorthair",
        "Maine Coon",
        "Ragdoll",
        "Domestic Shorthair",
        "Domestic Longhair",
        "Scottish Fold",
        "Bengal",
    ],
    Rabbit: ["Holland Lop", "Netherland Dwarf", "Mini Rex", "Lionhead"],
    Hamster: ["Syrian", "Dwarf", "Roborovski"],
    "Guinea Pig": ["American", "Abyssinian", "Peruvian", "Skinny Pig"],
    Bird: ["Parrot", "Cockatiel", "Budgie", "Lovebird", "Canary", "Finch"],
    Reptile: ["Bearded Dragon", "Leopard Gecko", "Iguana", "Snake"],
    Turtle: ["Red-Eared Slider", "Box Turtle", "Painted Turtle"],
    Fish: ["Goldfish", "Betta", "Koi", "Guppy"],
};

const presetBreeds = [...new Set(Object.values(breedOptionsBySpecies).flat())];

const defaultBreedOptions = ["Mixed", "Unknown", ...presetBreeds];

const genderOptions = [
    "Male",
    "Female",
    "Neutered Male",
    "Spayed Female",
    "Unknown",
];

const colorOptions = [
    "Black",
    "White",
    "Brown",
    "Cream",
    "Gray",
    "Orange / Ginger",
    "Black and White",
    "Brown and White",
    "Tri-color",
    "Multi-color",
];

const vaccinationStatusOptions = [
    { value: "unknown", label: "Unknown" },
    { value: "up_to_date", label: "Up to Date" },
    { value: "partial", label: "Partial" },
    { value: "not_vaccinated", label: "Not Vaccinated" },
];

function ageFromBirthDate(birthDate) {
    if (!birthDate) {
        return "";
    }

    const match = String(birthDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        return "";
    }

    const [, year, month, day] = match;
    const birth = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();

    if (Number.isNaN(birth.getTime()) || birth > today) {
        return "";
    }

    let age = today.getFullYear() - birth.getFullYear();
    const hadBirthdayThisYear =
        today.getMonth() > birth.getMonth()
        || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

    if (!hadBirthdayThisYear) {
        age -= 1;
    }

    return String(Math.max(0, age));
}

function SelectOrOtherField({
    label,
    value,
    options,
    onChange,
    required = false,
    error,
    placeholder,
    disabled = false,
}) {
    const isCustomValue = Boolean(value) && !options.includes(value);
    const [othersMode, setOthersMode] = useState(isCustomValue);

    useEffect(() => {
        if (!value) {
            setOthersMode(false);
            return;
        }

        setOthersMode(!options.includes(value));
    }, [value, options]);

    const selectValue =
        othersMode || isCustomValue ? OTHERS_VALUE : value || "";
    const showOtherInput = selectValue === OTHERS_VALUE;

    return (
        <div>
            <InputLabel value={label} />
            <select
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100"
                value={selectValue}
                disabled={disabled}
                onChange={(e) => {
                    const next = e.target.value;

                    if (next === OTHERS_VALUE) {
                        setOthersMode(true);
                        onChange(isCustomValue ? value : "");
                        return;
                    }

                    setOthersMode(false);
                    onChange(next);
                }}
                required={required && !showOtherInput}
            >
                <option value="">Select {label.toLowerCase()}</option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
                <option value={OTHERS_VALUE}>Other (not in list)</option>
            </select>
            {showOtherInput && (
                <>
                    <TextInput
                        className="mt-2 block w-full"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={
                            placeholder ?? `Specify ${label.toLowerCase()}`
                        }
                        required={required}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Enter your {label.toLowerCase()} because it is not in
                        the list above.
                    </p>
                </>
            )}
            {error && <InputError message={error} className="mt-1" />}
        </div>
    );
}

export default function PetsIndex({
    pets,
    clients,
    can_manage_records = true,
    can_toggle_pet_status = false,
}) {
    const user = usePage().props.auth.user;
    const activeClinic = usePage().props.activeClinic;
    const isPlatformAdmin = usePage().props.isPlatformAdmin ?? false;
    const isCustomer = user?.role === "customer";
    const canEditPet = (pet) =>
        isPlatformAdmin ||
        (isCustomer &&
            user?.client_id != null &&
            Number(user.client_id) === Number(pet.client_id));
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [speciesFilter, setSpeciesFilter] = useState("");
    const [vaccinationFilter, setVaccinationFilter] = useState("");
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

        if (!validateOthersFields()) {
            return;
        }

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

    const filterSpeciesOptions = useMemo(() => {
        const values = [
            ...new Set(pets.map((pet) => pet.species).filter(Boolean)),
        ];
        return values.sort((a, b) => String(a).localeCompare(String(b)));
    }, [pets]);

    const formBreedOptions = useMemo(() => {
        if (form.data.species && breedOptionsBySpecies[form.data.species]) {
            return breedOptionsBySpecies[form.data.species];
        }

        return defaultBreedOptions;
    }, [form.data.species]);

    const validateOthersFields = () => {
        const checks = [
            {
                field: "species",
                options: speciesOptions,
                label: "Species",
                required: true,
            },
            {
                field: "breed",
                options: formBreedOptions,
                label: "Breed",
                required: false,
            },
            {
                field: "gender",
                options: genderOptions,
                label: "Gender",
                required: false,
            },
            {
                field: "color",
                options: colorOptions,
                label: "Color",
                required: false,
            },
        ];

        form.clearErrors(...checks.map((check) => check.field));

        for (const check of checks) {
            const raw = form.data[check.field];
            const trimmed = String(raw ?? "").trim();

            if (check.required && !trimmed) {
                form.setError(
                    check.field,
                    `${check.label} is required. Select from the list or choose Other (not in list).`,
                );
                return false;
            }

            if (!trimmed) {
                continue;
            }

            if (trimmed === OTHERS_VALUE) {
                form.setError(
                    check.field,
                    `Please specify ${check.label.toLowerCase()} when choosing Other (not in list).`,
                );
                return false;
            }
        }

        return true;
    };

    const filteredPets = useMemo(() => {
        const query = search.trim().toLowerCase();

        return pets.filter((pet) => {
            if (speciesFilter && pet.species !== speciesFilter) {
                return false;
            }

            if (
                vaccinationFilter &&
                pet.vaccination_status !== vaccinationFilter
            ) {
                return false;
            }

            if (!query) {
                return true;
            }

            const vaccinationLabel =
                vaccinationStatusOptions.find(
                    (option) => option.value === pet.vaccination_status,
                )?.label ?? "";

            return [
                pet.pet_name,
                pet.client?.name,
                pet.species,
                pet.breed,
                pet.microchip_no,
                pet.color,
                vaccinationLabel,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [pets, search, speciesFilter, vaccinationFilter]);

    const clearFilters = () => {
        setSearch("");
        setSpeciesFilter("");
        setVaccinationFilter("");
    };

    const hasActiveFilters = Boolean(
        search || speciesFilter || vaccinationFilter,
    );

    const togglePetStatus = (pet) => {
        const isActive = pet.is_active !== false;

        if (isActive) {
            if (
                !confirm(
                    `Deactivate ${pet.pet_name}? You cannot schedule appointments while deactivated. If still deactivated after 1 year, this pet record will be automatically deleted.`,
                )
            ) {
                return;
            }
        } else if (
            !confirm(
                `Reactivate ${pet.pet_name}? Appointments can be scheduled again.`,
            )
        ) {
            return;
        }

        router.patch(
            route("pets.toggle-active", pet.id),
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                        {clinicScopeTitle(
                            "Pet Records",
                            activeClinic,
                            isPlatformAdmin,
                        )}
                    </h2>
                    {clinicScopeSubtitle(activeClinic, isPlatformAdmin) && (
                        <p className="mt-1 text-sm text-gray-500">
                            {clinicScopeSubtitle(activeClinic, isPlatformAdmin)}
                        </p>
                    )}
                </div>
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
                                <SelectOrOtherField
                                    label="Species"
                                    value={form.data.species}
                                    options={speciesOptions}
                                    onChange={(value) =>
                                        form.setData((data) => {
                                            const breeds =
                                                value &&
                                                breedOptionsBySpecies[value]
                                                    ? breedOptionsBySpecies[
                                                          value
                                                      ]
                                                    : defaultBreedOptions;
                                            const isCustomBreed =
                                                data.breed &&
                                                !presetBreeds.includes(
                                                    data.breed,
                                                ) &&
                                                !["Mixed", "Unknown"].includes(
                                                    data.breed,
                                                );

                                            return {
                                                ...data,
                                                species: value,
                                                breed: breeds.includes(
                                                    data.breed,
                                                )
                                                    ? data.breed
                                                    : isCustomBreed
                                                      ? data.breed
                                                      : "",
                                            };
                                        })
                                    }
                                    required
                                    error={form.errors.species}
                                    placeholder="Specify species"
                                />
                                <SelectOrOtherField
                                    label="Breed"
                                    value={form.data.breed}
                                    options={formBreedOptions}
                                    onChange={(value) =>
                                        form.setData("breed", value)
                                    }
                                    error={form.errors.breed}
                                    placeholder="Specify breed"
                                />
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
                                <SelectOrOtherField
                                    label="Gender"
                                    value={form.data.gender}
                                    options={genderOptions}
                                    onChange={(value) =>
                                        form.setData("gender", value)
                                    }
                                    error={form.errors.gender}
                                    placeholder="Specify gender"
                                />
                                <div>
                                    <InputLabel value="Birth Date" />
                                    <TextInput
                                        type="date"
                                        className="mt-1 block w-full"
                                        value={form.data.birth_date}
                                        max={new Date().toISOString().slice(0, 10)}
                                        onChange={(e) => {
                                            const birthDate = e.target.value;
                                            form.setData({
                                                ...form.data,
                                                birth_date: birthDate,
                                                age: ageFromBirthDate(birthDate),
                                            });
                                        }}
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
                                <SelectOrOtherField
                                    label="Color"
                                    value={form.data.color}
                                    options={colorOptions}
                                    onChange={(value) =>
                                        form.setData("color", value)
                                    }
                                    error={form.errors.color}
                                    placeholder="Specify color"
                                />
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
                                <InputLabel value="Remarks" />
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

                    <div className="mb-4 rounded-lg bg-white p-4 shadow">
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="sm:col-span-2">
                                <InputLabel value="Search" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder=""
                                />
                            </div>
                            <div>
                                <InputLabel value="Species" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                    value={speciesFilter}
                                    onChange={(e) =>
                                        setSpeciesFilter(e.target.value)
                                    }
                                >
                                    <option value="">All species</option>
                                    {filterSpeciesOptions.map((species) => (
                                        <option key={species} value={species}>
                                            {species}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Vaccination Status" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                    value={vaccinationFilter}
                                    onChange={(e) =>
                                        setVaccinationFilter(e.target.value)
                                    }
                                >
                                    <option value="">All statuses</option>
                                    {vaccinationStatusOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                            <span>
                                Showing {filteredPets.length} of {pets.length}{" "}
                                pets
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
                                        Pet Owner
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredPets.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-8 text-center text-sm text-gray-500"
                                        >
                                            No pets match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPets.map((p) => (
                                        <tr
                                            key={p.id}
                                            className={
                                                p.is_active === false
                                                    ? "bg-gray-50/80"
                                                    : ""
                                            }
                                        >
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
                                            <td className="px-4 py-3">
                                                {p.is_active === false ? (
                                                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                        Deactivated
                                                    </span>
                                                ) : (
                                                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={route(
                                                        "pets.show",
                                                        p.id,
                                                    )}
                                                    className="text-indigo-600 hover:underline"
                                                >
                                                    View
                                                </Link>
                                                {canEditPet(p) && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startEdit(p)
                                                        }
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
                                                {can_toggle_pet_status && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            togglePetStatus(p)
                                                        }
                                                        className={`ms-3 hover:underline ${
                                                            p.is_active ===
                                                            false
                                                                ? "text-emerald-600"
                                                                : "text-red-600"
                                                        }`}
                                                    >
                                                        {p.is_active === false
                                                            ? "Activate"
                                                            : "Deactivate"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
