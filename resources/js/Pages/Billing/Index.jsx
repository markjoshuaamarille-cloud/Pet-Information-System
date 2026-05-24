import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import { Head, router, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

const paymentMethods = ["cash", "card", "gcash", "maya", "bank_transfer"];
const billingStatuses = ["unpaid", "partial", "paid", "cancelled"];

const SERVICE_LABELS = {
    checkup: "Checkup",
    vaccination: "Vaccination",
    grooming: "Grooming",
    consultation: "Consultation",
    other: "Other",
};

const formatAppointmentDate = (scheduledAt) => {
    if (!scheduledAt) {
        return "No date";
    }

    const iso = String(scheduledAt);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }

    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) {
        return "No date";
    }

    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

const formatAppointmentOption = (appt) => {
    const petName = (appt.pet?.pet_name ?? "Unknown pet").toUpperCase();
    const service =
        appt.service_label ??
        SERVICE_LABELS[appt.service_type] ??
        SERVICE_LABELS[appt["type"]] ??
        "Other";
    const date = formatAppointmentDate(appt.scheduled_at);

    return `${petName} - ${date}(${service})`;
};

export default function BillingIndex({
    billings,
    clients,
    pets,
    appointments,
}) {
    const [editing, setEditing] = useState(null);
    const [payingBillingId, setPayingBillingId] = useState(null);

    const form = useForm({
        client_id: "",
        pet_id: "",
        appointment_id: "",
        subtotal: "0",
        tax: "0",
        discount: "0",
        due_date: "",
        notes: "",
        status: "unpaid",
    });

    const paymentForm = useForm({
        amount: "0",
        method: "cash",
        paid_at: "",
        reference_number: "",
        notes: "",
    });

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            form.put(route("billing.update", editing), {
                onSuccess: resetForm,
            });
            return;
        }
        form.post(route("billing.store"), { onSuccess: resetForm });
    };

    const startEdit = (billing) => {
        setEditing(billing.id);
        form.setData({
            client_id: String(billing.client_id),
            pet_id: billing.pet_id ? String(billing.pet_id) : "",
            appointment_id: billing.appointment_id
                ? String(billing.appointment_id)
                : "",
            subtotal: String(billing.subtotal ?? "0"),
            tax: String(billing.tax ?? "0"),
            discount: String(billing.discount ?? "0"),
            due_date: billing.due_date?.slice(0, 10) || "",
            notes: billing.notes || "",
            status: billing.status,
        });
    };

    const resetForm = () => {
        form.reset();
        form.setData("status", "unpaid");
        setEditing(null);
    };

    const startPayment = (billing) => {
        setPayingBillingId(billing.id);
        paymentForm.setData({
            amount: String(
                Math.max(
                    Number(billing.total_amount) - Number(billing.amount_paid),
                    0,
                ),
            ),
            method: "cash",
            paid_at: new Date().toISOString().slice(0, 16),
            reference_number: "",
            notes: "",
        });
    };

    const submitPayment = (e) => {
        e.preventDefault();
        paymentForm.post(route("billing.payments.store", payingBillingId), {
            onSuccess: () => {
                paymentForm.reset();
                setPayingBillingId(null);
            },
        });
    };

    const closePayment = () => {
        paymentForm.reset();
        setPayingBillingId(null);
    };

    const paidAppointmentIds = useMemo(
        () =>
            new Set(
                billings
                    .filter(
                        (billing) =>
                            billing.status === "paid" && billing.appointment_id,
                    )
                    .map((billing) => Number(billing.appointment_id)),
            ),
        [billings],
    );

    const filteredAppointments = useMemo(() => {
        let list = appointments.filter((appt) => {
            const appointmentId = Number(appt.id);
            const isSelectedDuringEdit =
                form.data.appointment_id &&
                String(appt.id) === form.data.appointment_id;
            if (
                paidAppointmentIds.has(appointmentId) &&
                !isSelectedDuringEdit
            ) {
                return false;
            }
            if (
                form.data.client_id &&
                String(appt.client_id) !== form.data.client_id
            ) {
                return false;
            }
            if (form.data.pet_id && String(appt.pet_id) !== form.data.pet_id) {
                return false;
            }
            return true;
        });

        if (form.data.appointment_id) {
            const selected = appointments.find(
                (appt) => String(appt.id) === form.data.appointment_id,
            );
            if (selected && !list.some((appt) => appt.id === selected.id)) {
                list = [selected, ...list];
            }
        }

        return list;
    }, [
        appointments,
        paidAppointmentIds,
        form.data.client_id,
        form.data.pet_id,
        form.data.appointment_id,
    ]);

    const selectedAppointment = useMemo(
        () =>
            form.data.appointment_id
                ? (appointments.find(
                      (appt) => String(appt.id) === form.data.appointment_id,
                  ) ?? null)
                : null,
        [appointments, form.data.appointment_id],
    );

    const filteredClients = useMemo(() => {
        if (!selectedAppointment) {
            return clients;
        }
        return clients.filter(
            (client) =>
                Number(client.id) === Number(selectedAppointment.client_id),
        );
    }, [clients, selectedAppointment]);

    const filteredPets = useMemo(() => {
        if (selectedAppointment) {
            return pets.filter(
                (pet) => Number(pet.id) === Number(selectedAppointment.pet_id),
            );
        }

        if (form.data.client_id) {
            return pets.filter(
                (pet) => String(pet.client_id) === form.data.client_id,
            );
        }

        return pets;
    }, [pets, selectedAppointment, form.data.client_id]);

    const onAppointmentChange = (appointmentId) => {
        if (!appointmentId) {
            form.setData("appointment_id", "");
            return;
        }

        const selected = appointments.find(
            (appt) => String(appt.id) === appointmentId,
        );
        if (!selected) {
            form.setData("appointment_id", appointmentId);
            return;
        }

        form.setData({
            appointment_id: appointmentId,
            client_id: String(selected.client_id),
            pet_id: String(selected.pet_id),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Billing & Payments
                </h2>
            }
        >
            <Head title="Billing" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <form
                        onSubmit={submit}
                        className="mb-6 rounded-lg bg-white p-6 shadow"
                    >
                        <h3 className="mb-4 font-semibold">
                            {editing ? "Edit Invoice" : "Create Invoice"}
                        </h3>
                        <div className="sm:col-span-3">
                            <InputLabel value="Appointment" />
                            <select
                                className="mt-1 w-full rounded-md border-gray-300"
                                value={form.data.appointment_id}
                                onChange={(e) =>
                                    onAppointmentChange(e.target.value)
                                }
                            >
                                <option value="">No linked appointment</option>
                                {filteredAppointments.map((appt) => (
                                    <option key={appt.id} value={appt.id}>
                                        {formatAppointmentOption(appt)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <InputLabel value="Client" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.client_id}
                                    onChange={(e) =>
                                        form.setData(
                                            "client_id",
                                            e.target.value,
                                        )
                                    }
                                    disabled={Boolean(selectedAppointment)}
                                    required
                                >
                                    <option value="">Select client</option>
                                    {filteredClients.map((client) => (
                                        <option
                                            key={client.id}
                                            value={client.id}
                                        >
                                            {client.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Pet (optional)" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.pet_id}
                                    onChange={(e) =>
                                        form.setData("pet_id", e.target.value)
                                    }
                                    disabled={Boolean(selectedAppointment)}
                                >
                                    <option value="">No linked pet</option>
                                    {filteredPets.map((pet) => (
                                        <option key={pet.id} value={pet.id}>
                                            {pet.pet_name} ({pet.client?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <br />

                            <div>
                                <InputLabel value="Subtotal" />
                                <TextInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="mt-1 block w-full"
                                    value={form.data.subtotal}
                                    onChange={(e) =>
                                        form.setData("subtotal", e.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Tax" />
                                <TextInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="mt-1 block w-full"
                                    value={form.data.tax}
                                    onChange={(e) =>
                                        form.setData("tax", e.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <InputLabel value="Discount" />
                                <TextInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="mt-1 block w-full"
                                    value={form.data.discount}
                                    onChange={(e) =>
                                        form.setData("discount", e.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <InputLabel value="Due Date" />
                                <TextInput
                                    type="date"
                                    className="mt-1 block w-full"
                                    value={form.data.due_date}
                                    onChange={(e) =>
                                        form.setData("due_date", e.target.value)
                                    }
                                />
                            </div>
                            {editing && (
                                <div>
                                    <InputLabel value="Status" />
                                    <select
                                        className="mt-1 w-full rounded-md border-gray-300"
                                        value={form.data.status}
                                        onChange={(e) =>
                                            form.setData(
                                                "status",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        {billingStatuses.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="sm:col-span-3">
                                <InputLabel value="Notes" />
                                <textarea
                                    className="mt-1 block w-full rounded-md border-gray-300"
                                    rows={3}
                                    value={form.data.notes}
                                    onChange={(e) =>
                                        form.setData("notes", e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                            <PrimaryButton disabled={form.processing}>
                                Save Invoice
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

                    {payingBillingId && (
                        <form
                            onSubmit={submitPayment}
                            className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-6"
                        >
                            <h3 className="mb-4 font-semibold text-emerald-900">
                                Post Payment
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <InputLabel value="Amount" />
                                    <TextInput
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        className="mt-1 block w-full"
                                        value={paymentForm.data.amount}
                                        onChange={(e) =>
                                            paymentForm.setData(
                                                "amount",
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Method" />
                                    <select
                                        className="mt-1 w-full rounded-md border-gray-300"
                                        value={paymentForm.data.method}
                                        onChange={(e) =>
                                            paymentForm.setData(
                                                "method",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        {paymentMethods.map((method) => (
                                            <option key={method} value={method}>
                                                {method}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <InputLabel value="Paid At" />
                                    <TextInput
                                        type="datetime-local"
                                        className="mt-1 block w-full"
                                        value={paymentForm.data.paid_at}
                                        onChange={(e) =>
                                            paymentForm.setData(
                                                "paid_at",
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Reference Number" />
                                    <TextInput
                                        className="mt-1 block w-full"
                                        value={
                                            paymentForm.data.reference_number
                                        }
                                        onChange={(e) =>
                                            paymentForm.setData(
                                                "reference_number",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <InputLabel value="Notes" />
                                    <TextInput
                                        className="mt-1 block w-full"
                                        value={paymentForm.data.notes}
                                        onChange={(e) =>
                                            paymentForm.setData(
                                                "notes",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                                <PrimaryButton
                                    disabled={paymentForm.processing}
                                >
                                    Save Payment
                                </PrimaryButton>
                                <button
                                    type="button"
                                    className="text-sm text-gray-600 hover:underline"
                                    onClick={closePayment}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        Invoice
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Client
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Total
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Paid
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Balance
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
                                {billings.map((billing) => {
                                    const balance =
                                        Number(billing.total_amount) -
                                        Number(billing.amount_paid);
                                    return (
                                        <tr key={billing.id}>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {billing.invoice_number}
                                                </p>
                                                {billing.due_date && (
                                                    <p className="text-xs text-gray-500">
                                                        Due:{" "}
                                                        {billing.due_date.slice(
                                                            0,
                                                            10,
                                                        )}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {billing.client?.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                {billing.total_amount}
                                            </td>
                                            <td className="px-4 py-3">
                                                {billing.amount_paid}
                                            </td>
                                            <td className="px-4 py-3">
                                                {balance.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 capitalize">
                                                {billing.status}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    className="text-indigo-600 hover:underline"
                                                    onClick={() =>
                                                        startEdit(billing)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                                {billing.status !== "paid" &&
                                                    billing.status !==
                                                        "cancelled" && (
                                                        <button
                                                            className="ms-3 text-emerald-600 hover:underline"
                                                            onClick={() =>
                                                                startPayment(
                                                                    billing,
                                                                )
                                                            }
                                                        >
                                                            Pay
                                                        </button>
                                                    )}
                                                <button
                                                    className="ms-3 text-red-600 hover:underline"
                                                    onClick={() =>
                                                        confirm(
                                                            "Delete invoice?",
                                                        ) &&
                                                        router.delete(
                                                            route(
                                                                "billing.destroy",
                                                                billing.id,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
