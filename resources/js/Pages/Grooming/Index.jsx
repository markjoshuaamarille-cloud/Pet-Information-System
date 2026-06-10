import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import ListDisplayControls from "@/Components/ListDisplayControls";
import useListDisplayLimit from "@/hooks/useListDisplayLimit";
import {
    formatClinicDate,
    formatClinicDateTime,
    toClinicDateInput,
} from "@/utils/formatDateTime";
import { Head, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

const statuses = ["completed", "cancelled"];

const groomingServiceOptions = [
    "Haircut / Style",
    "Bath - Normal",
    "Bath - Medicated",
    "Bath - Flea & Tick",
    "Nail Trim",
    "Ear Cleaning",
    "Eye Clean",
    "Dematting / Brushing",
    "Paw Balm / Cologne",
    "Others",
];

const parseServices = (value) => {
    if (!value?.trim()) {
        return [];
    }

    const parts = value
        .split(/[,\n]/)
        .map((part) => part.trim())
        .filter(Boolean);
    const matched = new Set(
        parts.filter((part) => groomingServiceOptions.includes(part)),
    );

    return groomingServiceOptions.filter((option) => matched.has(option));
};

const servicesToText = (services) => services.join(", ");

const getCustomNotes = (notes) => {
    if (!notes?.trim()) {
        return "";
    }

    const parts = notes
        .split(/[,\n]/)
        .map((part) => part.trim())
        .filter(Boolean);

    return parts
        .filter((part) => !groomingServiceOptions.includes(part))
        .join(", ");
};

const buildNotes = (services, customNotes) => {
    const lines = [];

    if (services.length > 0) {
        lines.push(services.join(", "));
    }

    if (customNotes?.trim()) {
        lines.push(customNotes.trim());
    }

    return lines.join("\n");
};

const syncServiceFields = (services, customNotes) => ({
    service_type: servicesToText(services),
    notes: buildNotes(services, customNotes),
});

const formatDate = (value) => formatClinicDate(value);

const formatDateTime = (value) => {
    if (!value) {
        return null;
    }

    const formatted = formatClinicDateTime(value);
    return formatted === "—" ? null : formatted;
};

export default function GroomingIndex({
    records,
    pets,
    groomingAppointments,
    can_manage_records = true,
}) {
    const [viewingRecord, setViewingRecord] = useState(null);
    const form = useForm({
        pet_id: "",
        appointment_id: "",
        service_type: "",
        service_date: "",
        status: "completed",
        notes: "",
    });

    const selectedServices = useMemo(
        () => parseServices(form.data.service_type),
        [form.data.service_type],
    );

    const toggleService = (option, checked) => {
        const current = parseServices(form.data.service_type);
        const next = checked
            ? groomingServiceOptions.filter(
                  (service) =>
                      current.includes(service) || service === option,
              )
            : current.filter((service) => service !== option);

        const customNotes = getCustomNotes(form.data.notes);

        form.setData({
            ...form.data,
            ...syncServiceFields(next, customNotes),
        });
        form.clearErrors("service_type");
    };

    const onNotesChange = (value) => {
        const services = parseServices(value);
        const customNotes = getCustomNotes(value);

        form.setData({
            ...form.data,
            ...syncServiceFields(services, customNotes),
        });
        form.clearErrors("service_type");
    };

    const submit = (e) => {
        e.preventDefault();

        if (
            form.data.status !== "cancelled" &&
            selectedServices.length === 0
        ) {
            form.setError(
                "service_type",
                "Select at least one grooming service.",
            );
            return;
        }

        form.clearErrors("service_type");
        form.post(route("grooming.store"), { onSuccess: resetForm });
    };

    const resetForm = () => {
        form.reset();
        form.setData("status", "completed");
        form.setData("service_type", "");
    };

    const onAppointmentChange = (appointmentId) => {
        if (!appointmentId) {
            form.setData({
                ...form.data,
                appointment_id: "",
                service_date: "",
            });
            return;
        }

        const selected = groomingAppointments.find(
            (appt) => String(appt.id) === appointmentId,
        );

        if (selected) {
            form.setData({
                ...form.data,
                appointment_id: appointmentId,
                pet_id: String(selected.pet_id),
                service_date: toClinicDateInput(selected.scheduled_at),
            });
            return;
        }

        form.setData("appointment_id", appointmentId);
    };

    const filteredPets = useMemo(() => {
        if (!form.data.appointment_id) {
            return pets;
        }

        const selected = groomingAppointments.find(
            (appt) => String(appt.id) === form.data.appointment_id,
        );

        if (!selected) {
            return pets;
        }

        return pets.filter((pet) => Number(pet.id) === Number(selected.pet_id));
    }, [pets, groomingAppointments, form.data.appointment_id]);

    const {
        visibleItems: visibleRecords,
        displayLimit,
        setDisplayLimit,
        totalCount: recordListCount,
        showingCount: recordShowingCount,
    } = useListDisplayLimit(records);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Grooming Records
                </h2>
            }
        >
            <Head title="Grooming" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    {can_manage_records && (
                    <form
                        onSubmit={submit}
                        className="mb-6 rounded-lg bg-white p-6 shadow"
                    >
                        <h3 className="mb-4 font-semibold">Add Grooming Record</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <InputLabel value="Grooming Appointment" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.appointment_id}
                                    onChange={(e) =>
                                        onAppointmentChange(e.target.value)
                                    }
                                    required
                                >
                                    <option value="">Select appointment</option>
                                    {groomingAppointments.map((appt) => (
                                        <option key={appt.id} value={appt.id}>
                                            {appt.pet?.pet_name} (
                                            {appt.client?.name}) -{" "}
                                            {new Date(
                                                appt.scheduled_at,
                                            ).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Pet" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.pet_id}
                                    onChange={(e) =>
                                        form.setData("pet_id", e.target.value)
                                    }
                                    required
                                >
                                    <option value="">Select pet</option>
                                    {filteredPets.map((pet) => (
                                        <option key={pet.id} value={pet.id}>
                                            {pet.pet_name} ({pet.client?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Service Date" />
                                <TextInput
                                    type="date"
                                    className="mt-1 block w-full"
                                    value={form.data.service_date}
                                    onChange={(e) =>
                                        form.setData(
                                            "service_date",
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Status" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.status}
                                    onChange={(e) =>
                                        form.setData("status", e.target.value)
                                    }
                                >
                                    {statuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status.charAt(0).toUpperCase() +
                                                status.slice(1)}
                                        </option>
                                    ))}
                                </select>
                                {form.data.status === "cancelled" && (
                                    <p className="mt-1 text-xs text-amber-700">
                                        The linked grooming appointment will be
                                        marked cancelled in Scheduling for the
                                        pet owner.
                                    </p>
                                )}
                            </div>
                            {form.data.status !== "cancelled" && (
                            <div className="sm:col-span-3">
                                <InputLabel value="Service Type" />
                                <div className="mt-1 grid grid-cols-1 gap-2 rounded-md border border-gray-300 p-3 text-sm sm:grid-cols-2">
                                    {groomingServiceOptions.map((option) => {
                                        const selected =
                                            selectedServices.includes(option);

                                        return (
                                            <label
                                                key={option}
                                                className="flex items-center gap-2"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={(e) =>
                                                        toggleService(
                                                            option,
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                                <span>{option}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {form.errors.service_type && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {form.errors.service_type}
                                    </p>
                                )}
                            </div>
                            )}
                            <div className="sm:col-span-3">
                                <InputLabel value="Notes" />
                                <textarea
                                    className="mt-1 block w-full rounded-md border-gray-300"
                                    rows={3}
                                    value={form.data.notes}
                                    onChange={(e) => onNotesChange(e.target.value)}
                                    placeholder="Selected services appear here automatically. Add extra notes on a new line."
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                            <PrimaryButton disabled={form.processing}>
                                Save
                            </PrimaryButton>
                        </div>
                    </form>
                    )}
                    {!can_manage_records && (
                        <p className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                            View-only access. Review grooming services here when preparing billing.
                        </p>
                    )}

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Pet</th>
                                    <th className="px-4 py-3 text-left">
                                        Service
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Date
                                    </th>
                                    {/* <th className="px-4 py-3 text-left">
                                        Price
                                    </th> */}
                                    <th className="px-4 py-3 text-left">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visibleRecords.map((record) => (
                                    <tr key={record.id}>
                                        <td className="px-4 py-3">
                                            {record.pet?.pet_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.service_type}
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatDate(record.service_date) ??
                                                "—"}
                                        </td>
                                        {/* <td className="px-4 py-3">
                                            {record.price}
                                        </td> */}
                                        <td className="px-4 py-3 capitalize">
                                            {record.status}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                className="text-indigo-600 hover:underline"
                                                onClick={() =>
                                                    setViewingRecord(record)
                                                }
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <ListDisplayControls
                            totalCount={recordListCount}
                            showingCount={recordShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>

                    <Modal
                        show={!!viewingRecord}
                        onClose={() => setViewingRecord(null)}
                        maxWidth="lg"
                    >
                        {viewingRecord && (
                            <div className="p-6">
                                <div className="mb-4 flex items-start justify-between gap-4">
                                    <div>
                                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                                            Grooming Record
                                        </span>
                                        <h3 className="mt-2 text-lg font-semibold text-gray-900">
                                            {viewingRecord.pet?.pet_name ??
                                                "Pet record"}
                                        </h3>
                                    </div>
                                    <SecondaryButton
                                        type="button"
                                        onClick={() => setViewingRecord(null)}
                                    >
                                        Close
                                    </SecondaryButton>
                                </div>

                                <dl className="space-y-3 text-sm">
                                    <div>
                                        <dt className="text-gray-500">Pet</dt>
                                        <dd>
                                            {viewingRecord.pet?.pet_name ?? "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Owner</dt>
                                        <dd>
                                            {viewingRecord.pet?.client?.name ??
                                                "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">
                                            Service Date
                                        </dt>
                                        <dd>
                                            {formatDate(
                                                viewingRecord.service_date,
                                            ) ?? "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Status</dt>
                                        <dd className="capitalize">
                                            {viewingRecord.status ?? "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">
                                            Service Type
                                        </dt>
                                        <dd>
                                            {parseServices(
                                                viewingRecord.service_type,
                                            ).length > 0 ? (
                                                <ul className="mt-1 list-inside list-disc">
                                                    {parseServices(
                                                        viewingRecord.service_type,
                                                    ).map((service) => (
                                                        <li key={service}>
                                                            {service}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                viewingRecord.service_type ||
                                                "—"
                                            )}
                                        </dd>
                                    </div>
                                    {viewingRecord.appointment && (
                                        <div>
                                            <dt className="text-gray-500">
                                                Linked Appointment
                                            </dt>
                                            <dd>
                                                {formatDateTime(
                                                    viewingRecord.appointment
                                                        .scheduled_at,
                                                ) ?? "—"}
                                            </dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-gray-500">Notes</dt>
                                        <dd className="whitespace-pre-wrap">
                                            {viewingRecord.notes || "—"}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        )}
                    </Modal>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
