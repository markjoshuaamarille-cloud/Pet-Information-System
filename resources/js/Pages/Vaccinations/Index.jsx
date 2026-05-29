import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import InputError from "@/Components/InputError";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import { Head, useForm, router } from "@inertiajs/react";
import { useMemo, useState } from "react";

const statuses = ["scheduled", "completed", "missed"];

const formatDate = (value) => {
    if (!value) {
        return "—";
    }

    const iso = String(value);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString();
};

const formatDateTime = (value) => {
    if (!value) {
        return "—";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

export default function VaccinationsIndex({
    vaccinations,
    pets,
    vaccinationAppointments,
    vaccines,
    can_manage_records = true,
}) {
    const [editing, setEditing] = useState(null);
    const [viewingRecord, setViewingRecord] = useState(null);
    const form = useForm({
        pet_id: "",
        appointment_id: "",
        medicine_id: "",
        dose: "",
        quantity_used: "1",
        administered_on: "",
        next_due_date: "",
        status: "completed",
        notes: "",
    });

    const submit = (e) => {
        e.preventDefault();

        if (editing) {
            form.put(route("vaccinations.update", editing), {
                onSuccess: () => {
                    resetForm();
                },
            });
            return;
        }

        form.post(route("vaccinations.store"), {
            onSuccess: () => {
                resetForm();
            },
        });
    };

    const resetForm = () => {
        form.reset();
        form.setData("quantity_used", "1");
        form.setData("status", "completed");
        setEditing(null);
    };

    const startEdit = (record) => {
        setEditing(record.id);
        form.setData({
            pet_id: String(record.pet_id),
            appointment_id: record.appointment_id
                ? String(record.appointment_id)
                : "",
            medicine_id: record.medicine_id ? String(record.medicine_id) : "",
            dose: record.dose || "",
            quantity_used: String(record.quantity_used ?? 1),
            administered_on: record.administered_on?.slice(0, 10) || "",
            next_due_date: record.next_due_date?.slice(0, 10) || "",
            status: record.status,
            notes: record.notes || "",
        });
    };

    const onAppointmentChange = (appointmentId) => {
        if (!appointmentId) {
            form.setData({
                ...form.data,
                appointment_id: "",
                pet_id: "",
            });
            return;
        }

        const selected = appointmentOptions.find(
            (appt) => String(appt.id) === appointmentId,
        );
        if (selected) {
            form.setData({
                ...form.data,
                appointment_id: appointmentId,
                pet_id: String(selected.pet_id),
            });
            return;
        }

        form.setData("appointment_id", appointmentId);
    };

    const appointmentOptions = useMemo(() => {
        const list = [...vaccinationAppointments];

        if (editing) {
            const record = vaccinations.find((entry) => entry.id === editing);
            if (
                record?.appointment &&
                !list.some((appt) => appt.id === record.appointment.id)
            ) {
                list.unshift(record.appointment);
            }
        }

        return list;
    }, [vaccinationAppointments, editing, vaccinations]);

    const selectedAppointment = useMemo(
        () =>
            form.data.appointment_id
                ? (appointmentOptions.find(
                      (appt) => String(appt.id) === form.data.appointment_id,
                  ) ?? null)
                : null,
        [appointmentOptions, form.data.appointment_id],
    );

    const canCreateRecord = editing || appointmentOptions.length > 0;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Vaccination Management
                </h2>
            }
        >
            <Head title="Vaccinations" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    {can_manage_records && (
                    <form
                        onSubmit={submit}
                        className="mb-6 rounded-lg bg-white p-6 shadow"
                    >
                        <h3 className="mb-4 font-semibold">
                            {editing
                                ? "Edit Vaccination Record"
                                : "Add Vaccination Record"}
                        </h3>
                        {/* {!editing && vaccinationAppointments.length === 0 && (
                            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                Schedule a vaccination appointment first before
                                creating a record.
                            </p>
                        )} */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <InputLabel value="Vaccination Appointment" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.appointment_id}
                                    onChange={(e) =>
                                        onAppointmentChange(e.target.value)
                                    }
                                    required
                                >
                                    <option value="">
                                        Select vaccination appointment
                                    </option>
                                    {appointmentOptions.map((appt) => (
                                        <option key={appt.id} value={appt.id}>
                                            {appt.pet?.pet_name} (
                                            {appt.client?.name}) -{" "}
                                            {new Date(
                                                appt.scheduled_at,
                                            ).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    message={form.errors.appointment_id}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <InputLabel value="Pet" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.pet_id}
                                    onChange={(e) =>
                                        form.setData("pet_id", e.target.value)
                                    }
                                    disabled={Boolean(selectedAppointment)}
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
                                    onChange={(e) =>
                                        form.setData(
                                            "medicine_id",
                                            e.target.value,
                                        )
                                    }
                                    required
                                >
                                    <option value="">Select vaccine</option>
                                    {vaccines.map((vaccine) => (
                                        <option
                                            key={vaccine.id}
                                            value={vaccine.id}
                                        >
                                            {vaccine.name} ({vaccine.quantity}{" "}
                                            {vaccine.unit} available)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Dose" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.dose}
                                    onChange={(e) =>
                                        form.setData("dose", e.target.value)
                                    }
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
                                    onChange={(e) =>
                                        form.setData(
                                            "quantity_used",
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Administered On" />
                                <TextInput
                                    type="date"
                                    className="mt-1 block w-full"
                                    value={form.data.administered_on}
                                    onChange={(e) =>
                                        form.setData(
                                            "administered_on",
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Next Due Date" />
                                <TextInput
                                    type="date"
                                    className="mt-1 block w-full"
                                    value={form.data.next_due_date}
                                    onChange={(e) =>
                                        form.setData(
                                            "next_due_date",
                                            e.target.value,
                                        )
                                    }
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
                                    onChange={(e) =>
                                        form.setData("notes", e.target.value)
                                    }
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <PrimaryButton
                                disabled={form.processing || !canCreateRecord}
                            >
                                Save
                            </PrimaryButton>
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
                    )}
                    {!can_manage_records && (
                        <p className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                            View-only access. Review vaccination and medicine records here when preparing billing.
                        </p>
                    )}

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Pet</th>
                                    <th className="px-4 py-3 text-left">
                                        Vaccine
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Qty Used
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Dose
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Given
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Next Due
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
                                {vaccinations.map((record) => (
                                    <tr key={record.id}>
                                        <td className="px-4 py-3">
                                            {record.pet?.pet_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.medicine?.name ??
                                                record.vaccine_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.quantity_used ?? 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.dose || "-"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatDate(record.administered_on)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatDate(record.next_due_date)}
                                        </td>
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
                                            {can_manage_records && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            startEdit(record)
                                                        }
                                                        className="ms-3 text-indigo-600 hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            confirm(
                                                                "Delete vaccination record?",
                                                            ) &&
                                                            router.delete(
                                                                route(
                                                                    "vaccinations.destroy",
                                                                    record.id,
                                                                ),
                                                            )
                                                        }
                                                        className="ms-3 text-red-600 hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                                        <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                                            Vaccination Record
                                        </span>
                                        <h3 className="mt-2 text-lg font-semibold text-gray-900">
                                            {viewingRecord.medicine?.name ??
                                                viewingRecord.vaccine_name ??
                                                "Vaccination"}
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
                                            Vaccine
                                        </dt>
                                        <dd>
                                            {viewingRecord.medicine?.name ??
                                                viewingRecord.vaccine_name ??
                                                "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Dose</dt>
                                        <dd>{viewingRecord.dose || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">
                                            Quantity Used
                                        </dt>
                                        <dd>
                                            {viewingRecord.quantity_used ?? 1}
                                            {viewingRecord.medicine?.unit
                                                ? ` ${viewingRecord.medicine.unit}`
                                                : ""}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">
                                            Administered On
                                        </dt>
                                        <dd>
                                            {formatDate(
                                                viewingRecord.administered_on,
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">
                                            Next Due Date
                                        </dt>
                                        <dd>
                                            {formatDate(
                                                viewingRecord.next_due_date,
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">Status</dt>
                                        <dd className="capitalize">
                                            {viewingRecord.status}
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
                                                )}
                                            </dd>
                                        </div>
                                    )}
                                    {viewingRecord.notes && (
                                        <div>
                                            <dt className="text-gray-500">
                                                Notes
                                            </dt>
                                            <dd className="whitespace-pre-wrap">
                                                {viewingRecord.notes}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        )}
                    </Modal>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
