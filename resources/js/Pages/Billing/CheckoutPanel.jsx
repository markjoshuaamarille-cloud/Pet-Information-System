import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import { router, useForm, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import { formatClinicDate } from "@/utils/formatDateTime";

const formatPeso = (value) => `₱${Number(value ?? 0).toFixed(2)}`;

const SERVICE_LABELS = {
    checkup: "Checkup",
    vaccination: "Vaccination",
    grooming: "Grooming",
    consultation: "Consultation",
    surgery: "Surgery",
    boarding: "Boarding / Hotel",
    emergency_care: "Emergency Care",
    medication: "Medication",
    other: "Other",
};

const formatAppointmentOption = (appt) => {
    const petName = (appt.pet?.pet_name ?? "Unknown pet").toUpperCase();
    const service =
        appt.service_label ??
        SERVICE_LABELS[appt.service_type] ??
        "Other";
    const date = formatClinicDate(appt.scheduled_at) ?? "No date";

    return `${petName} - ${date} (${service})`;
};

const createExtraLine = () => ({
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unit_price: "",
});

export default function CheckoutPanel({
    clients = [],
    pets = [],
    appointments = [],
    serviceCatalogs = [],
    unbilledRecords = [],
    linkedAppointmentIds = new Set(),
    prefillAppointmentId = null,
}) {
    const { errors: pageErrors = {} } = usePage().props;
    const [selectedRecordIds, setSelectedRecordIds] = useState([]);
    const [extraLines, setExtraLines] = useState([]);
    const [collectPayment, setCollectPayment] = useState(false);
    const [taxTouched, setTaxTouched] = useState(false);
    const [discountTouched, setDiscountTouched] = useState(false);
    const [processing, setProcessing] = useState(false);

    const form = useForm({
        client_id: "",
        pet_id: "",
        appointment_id: "",
        tax: "0",
        discount: "0",
        due_date: "",
        notes: "",
        collect_payment: false,
        payment: {
            amount: "0",
            method: "cash",
            paid_at: new Date().toISOString().slice(0, 16),
            reference_number: "",
            notes: "",
        },
    });

    const checkoutAppointments = useMemo(() => {
        return appointments.filter((appt) => {
            if (appt.status !== "completed") {
                return false;
            }
            if (linkedAppointmentIds.has(Number(appt.id))) {
                return false;
            }
            return true;
        });
    }, [appointments, linkedAppointmentIds]);

    const selectedAppointment = useMemo(
        () =>
            form.data.appointment_id
                ? appointments.find(
                      (a) => String(a.id) === form.data.appointment_id,
                  ) ?? null
                : null,
        [appointments, form.data.appointment_id],
    );

    const filteredClients = useMemo(() => {
        if (!selectedAppointment) {
            return clients;
        }
        return clients.filter(
            (c) => Number(c.id) === Number(selectedAppointment.client_id),
        );
    }, [clients, selectedAppointment]);

    const filteredPets = useMemo(() => {
        if (selectedAppointment) {
            return pets.filter(
                (p) => Number(p.id) === Number(selectedAppointment.pet_id),
            );
        }
        if (form.data.client_id) {
            return pets.filter(
                (p) => String(p.client_id) === form.data.client_id,
            );
        }
        return pets;
    }, [pets, selectedAppointment, form.data.client_id]);

    const visibleRecords = useMemo(() => {
        return unbilledRecords.filter((record) => {
            if (
                form.data.pet_id &&
                String(record.pet_id) !== form.data.pet_id
            ) {
                return false;
            }
            if (
                form.data.client_id &&
                String(record.client_id) !== form.data.client_id
            ) {
                return false;
            }
            return true;
        });
    }, [unbilledRecords, form.data.client_id, form.data.pet_id]);

    const selectedRecords = useMemo(
        () =>
            visibleRecords.filter((r) =>
                selectedRecordIds.includes(Number(r.id)),
            ),
        [visibleRecords, selectedRecordIds],
    );

    const servicesSubtotal = useMemo(
        () =>
            selectedRecords.reduce(
                (sum, r) => sum + Number(r.subtotal ?? r.line_total ?? 0),
                0,
            ),
        [selectedRecords],
    );

    const suggestedTax = useMemo(
        () =>
            selectedRecords.reduce(
                (sum, r) => sum + Number(r.tax_amount ?? 0),
                0,
            ),
        [selectedRecords],
    );

    const suggestedDiscount = useMemo(
        () =>
            selectedRecords.reduce(
                (sum, r) => sum + Number(r.discount ?? 0),
                0,
            ),
        [selectedRecords],
    );

    const extraSubtotal = useMemo(
        () =>
            extraLines.reduce((sum, line) => {
                const qty = Number(line.quantity) || 0;
                const price = Number(line.unit_price) || 0;
                return sum + qty * price;
            }, 0),
        [extraLines],
    );

    const subtotal = servicesSubtotal + extraSubtotal;
    const tax = Number(taxTouched ? form.data.tax : suggestedTax) || 0;
    const discount =
        Number(discountTouched ? form.data.discount : suggestedDiscount) || 0;
    const total = Math.max(subtotal + tax - discount, 0);

    useEffect(() => {
        if (!prefillAppointmentId || form.data.appointment_id) {
            return;
        }
        onAppointmentChange(String(prefillAppointmentId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefillAppointmentId]);

    useEffect(() => {
        if (collectPayment) {
            form.setData("payment", {
                ...form.data.payment,
                amount: total.toFixed(2),
            });
        }
    }, [total, collectPayment]);

    const onAppointmentChange = (appointmentId) => {
        if (!appointmentId) {
            form.setData({
                ...form.data,
                appointment_id: "",
            });
            return;
        }

        const appt = appointments.find((a) => String(a.id) === appointmentId);
        if (!appt) {
            form.setData("appointment_id", appointmentId);
            return;
        }

        form.setData({
            ...form.data,
            appointment_id: appointmentId,
            client_id: String(appt.client_id),
            pet_id: String(appt.pet_id),
        });

        // Prefer records explicitly linked to this visit; fall back to all of
        // the pet's unbilled records when nothing was linked.
        const visitRecordIds = unbilledRecords
            .filter((r) => Number(r.appointment_id) === Number(appt.id))
            .map((r) => Number(r.id));
        const petRecordIds = unbilledRecords
            .filter((r) => Number(r.pet_id) === Number(appt.pet_id))
            .map((r) => Number(r.id));

        setSelectedRecordIds(
            visitRecordIds.length > 0 ? visitRecordIds : petRecordIds,
        );

        // No priced services for this visit: suggest a walk-in line from the
        // catalog entry matching the appointment's service type.
        if (petRecordIds.length === 0) {
            const matchedService = serviceCatalogs.find(
                (s) => String(s.code) === String(appt.service_type),
            );
            if (matchedService) {
                setExtraLines((prev) =>
                    prev.length > 0
                        ? prev
                        : [
                              {
                                  id: crypto.randomUUID(),
                                  description: matchedService.name,
                                  quantity: "1",
                                  unit_price: String(
                                      matchedService.default_price ?? "0",
                                  ),
                              },
                          ],
                );
            }
        }

        setTaxTouched(false);
        setDiscountTouched(false);
    };

    const onClientChange = (clientId) => {
        form.setData({
            ...form.data,
            client_id: clientId,
            pet_id: "",
            appointment_id: "",
        });
        setSelectedRecordIds([]);
    };

    const onPetChange = (petId) => {
        form.setData({
            ...form.data,
            pet_id: petId,
            appointment_id: "",
        });

        if (petId) {
            const petRecordIds = unbilledRecords
                .filter((r) => String(r.pet_id) === petId)
                .map((r) => Number(r.id));
            setSelectedRecordIds(petRecordIds);
        } else {
            setSelectedRecordIds([]);
        }
        setTaxTouched(false);
        setDiscountTouched(false);
    };

    const toggleRecord = (recordId) => {
        setSelectedRecordIds((prev) =>
            prev.includes(recordId)
                ? prev.filter((id) => id !== recordId)
                : [...prev, recordId],
        );
        setTaxTouched(false);
        setDiscountTouched(false);
    };

    const toggleAllRecords = () => {
        if (selectedRecordIds.length === visibleRecords.length) {
            setSelectedRecordIds([]);
        } else {
            setSelectedRecordIds(visibleRecords.map((r) => Number(r.id)));
        }
        setTaxTouched(false);
        setDiscountTouched(false);
    };

    const addExtraLine = () => {
        setExtraLines((prev) => [...prev, createExtraLine()]);
    };

    const updateExtraLine = (id, field, value) => {
        setExtraLines((prev) =>
            prev.map((line) =>
                line.id === id ? { ...line, [field]: value } : line,
            ),
        );
    };

    const removeExtraLine = (id) => {
        setExtraLines((prev) => prev.filter((line) => line.id !== id));
    };

    const addCatalogLine = (serviceCatalogId) => {
        if (!serviceCatalogId) {
            return;
        }
        const service = serviceCatalogs.find(
            (s) => String(s.id) === serviceCatalogId,
        );
        if (!service) {
            return;
        }
        setExtraLines((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                description: service.name,
                quantity: "1",
                unit_price: String(service.default_price ?? "0"),
            },
        ]);
    };

    const resetCheckout = () => {
        form.reset();
        form.setData("payment", {
            amount: "0",
            method: "cash",
            paid_at: new Date().toISOString().slice(0, 16),
            reference_number: "",
            notes: "",
        });
        setSelectedRecordIds([]);
        setExtraLines([]);
        setCollectPayment(false);
        setTaxTouched(false);
        setDiscountTouched(false);
    };

    const submit = (e) => {
        e.preventDefault();

        if (!form.data.client_id) {
            return;
        }

        if (selectedRecordIds.length === 0 && extraLines.length === 0) {
            return;
        }

        const payload = {
            client_id: form.data.client_id,
            pet_id: form.data.pet_id || null,
            appointment_id: form.data.appointment_id || null,
            health_record_ids: selectedRecordIds,
            extra_lines: extraLines
                .filter((line) => line.description.trim())
                .map((line) => ({
                    description: line.description.trim(),
                    quantity: Number(line.quantity) || 1,
                    unit_price: Number(line.unit_price) || 0,
                })),
            tax: tax.toFixed(2),
            discount: discount.toFixed(2),
            due_date: form.data.due_date || null,
            notes: form.data.notes || null,
            collect_payment: collectPayment,
            payment: collectPayment ? form.data.payment : undefined,
        };

        setProcessing(true);
        router.post(route("billing.checkout"), payload, {
            preserveScroll: true,
            onSuccess: resetCheckout,
            onFinish: () => setProcessing(false),
        });
    };

    const canSubmit =
        form.data.client_id &&
        (selectedRecordIds.length > 0 ||
            extraLines.some((l) => l.description.trim()));

    return (
        <form
            onSubmit={submit}
            className="mb-6 overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm"
        >
            <div className="border-b border-indigo-100 bg-indigo-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-white">Checkout</h3>
                <p className="mt-1 text-sm text-indigo-100">
                    Select a visit, choose services to bill, add walk-in charges
                    if needed, then create the invoice and collect payment.
                </p>
            </div>

            <div className="space-y-6 p-6">
                {checkoutAppointments.length > 0 &&
                    !form.data.appointment_id && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-semibold text-amber-900">
                                Awaiting billing —{" "}
                                {checkoutAppointments.length} completed{" "}
                                {checkoutAppointments.length === 1
                                    ? "visit"
                                    : "visits"}{" "}
                                without an invoice
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {checkoutAppointments
                                    .slice(0, 6)
                                    .map((appt) => (
                                        <button
                                            key={appt.id}
                                            type="button"
                                            onClick={() =>
                                                onAppointmentChange(
                                                    String(appt.id),
                                                )
                                            }
                                            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-300 transition hover:bg-amber-100"
                                        >
                                            {formatAppointmentOption(appt)}
                                        </button>
                                    ))}
                                {checkoutAppointments.length > 6 && (
                                    <span className="self-center text-xs text-amber-700">
                                        +{checkoutAppointments.length - 6} more
                                        in the dropdown below
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                <div className="grid gap-4 lg:grid-cols-3">
                    <div>
                        <InputLabel value="Start from appointment (optional)" />
                        <select
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                            value={form.data.appointment_id}
                            onChange={(e) =>
                                onAppointmentChange(e.target.value)
                            }
                        >
                            <option value="">No appointment</option>
                            {checkoutAppointments.length === 0 ? (
                                <option value="" disabled>
                                    No completed appointments available
                                </option>
                            ) : (
                                checkoutAppointments.map((appt) => (
                                    <option key={appt.id} value={String(appt.id)}>
                                        {formatAppointmentOption(appt)}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                    <div>
                        <InputLabel value="Client *" />
                        <select
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                            value={form.data.client_id}
                            onChange={(e) => onClientChange(e.target.value)}
                            disabled={Boolean(selectedAppointment)}
                            required
                        >
                            <option value="">Select client</option>
                            {filteredClients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <InputLabel value="Pet (optional)" />
                        <select
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                            value={form.data.pet_id}
                            onChange={(e) => onPetChange(e.target.value)}
                            disabled={Boolean(selectedAppointment)}
                        >
                            <option value="">Any pet / walk-in</option>
                            {filteredPets.map((pet) => (
                                <option key={pet.id} value={pet.id}>
                                    {pet.pet_name}
                                    {pet.client?.name
                                        ? ` (${pet.client.name})`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h4 className="font-semibold text-gray-800">
                                Unbilled services
                            </h4>
                            <p className="text-xs text-gray-500">
                                Select the priced health records to include on
                                this invoice.
                            </p>
                        </div>
                        {visibleRecords.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleAllRecords}
                                className="text-sm text-indigo-600 hover:underline"
                            >
                                {selectedRecordIds.length ===
                                visibleRecords.length
                                    ? "Deselect all"
                                    : "Select all"}
                            </button>
                        )}
                    </div>

                    {visibleRecords.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                            {form.data.client_id || form.data.pet_id
                                ? "No unbilled priced services for this selection. Add a walk-in charge below or record services on the pet profile first."
                                : "Select a client or appointment to see unbilled services."}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="w-10 px-3 py-2" />
                                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                                            Service
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                                            Pet
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                                            Pet owner
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-600">
                                            Date
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-gray-600">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {visibleRecords.map((record) => {
                                        const checked = selectedRecordIds.includes(
                                            Number(record.id),
                                        );
                                        return (
                                            <tr
                                                key={record.id}
                                                className={
                                                    checked
                                                        ? "bg-indigo-50/60"
                                                        : ""
                                                }
                                            >
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() =>
                                                            toggleRecord(
                                                                Number(
                                                                    record.id,
                                                                ),
                                                            )
                                                        }
                                                        className="rounded border-gray-300 text-indigo-600"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <p className="font-medium text-gray-800">
                                                        {record.title}
                                                        {form.data
                                                            .appointment_id &&
                                                            Number(
                                                                record.appointment_id,
                                                            ) ===
                                                                Number(
                                                                    form.data
                                                                        .appointment_id,
                                                                ) && (
                                                                <span className="ms-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                                                    This visit
                                                                </span>
                                                            )}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {SERVICE_LABELS[
                                                            record.type
                                                        ] ?? record.type}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {record.pet_name}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {record.client_name ?? "—"}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                    {formatClinicDate(
                                                        record.record_date,
                                                    ) ?? "—"}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-800">
                                                    {formatPeso(
                                                        record.line_total,
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h4 className="font-semibold text-gray-800">
                                Walk-in charges
                            </h4>
                            <p className="text-xs text-gray-500">
                                Optional extra items not tied to a health
                                record.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <select
                                className="rounded-md border-gray-300 text-sm shadow-sm"
                                defaultValue=""
                                onChange={(e) => {
                                    addCatalogLine(e.target.value);
                                    e.target.value = "";
                                }}
                            >
                                <option value="">Add from catalog…</option>
                                {serviceCatalogs.map((service) => (
                                    <option
                                        key={service.id}
                                        value={service.id}
                                    >
                                        {service.name} (
                                        {formatPeso(service.default_price)})
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={addExtraLine}
                                className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
                            >
                                + Custom line
                            </button>
                        </div>
                    </div>

                    {extraLines.length === 0 ? (
                        <p className="text-sm text-gray-400">
                            No walk-in charges added.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {extraLines.map((line) => (
                                <div
                                    key={line.id}
                                    className="grid gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-12"
                                >
                                    <div className="sm:col-span-5">
                                        <TextInput
                                            className="block w-full text-sm"
                                            placeholder="Description"
                                            value={line.description}
                                            onChange={(e) =>
                                                updateExtraLine(
                                                    line.id,
                                                    "description",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <TextInput
                                            type="number"
                                            min="1"
                                            className="block w-full text-sm"
                                            placeholder="Qty"
                                            value={line.quantity}
                                            onChange={(e) =>
                                                updateExtraLine(
                                                    line.id,
                                                    "quantity",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <TextInput
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="block w-full text-sm"
                                            placeholder="Unit price"
                                            value={line.unit_price}
                                            onChange={(e) =>
                                                updateExtraLine(
                                                    line.id,
                                                    "unit_price",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center justify-between sm:col-span-2">
                                        <span className="text-sm font-medium text-gray-700">
                                            {formatPeso(
                                                (Number(line.quantity) || 0) *
                                                    (Number(line.unit_price) ||
                                                        0),
                                            )}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeExtraLine(line.id)
                                            }
                                            className="text-sm text-red-600 hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <InputLabel value="Subtotal" />
                        <p className="mt-1 text-lg font-semibold text-gray-800">
                            {formatPeso(subtotal)}
                        </p>
                    </div>
                    <div>
                        <InputLabel value="Tax (VAT)" />
                        <TextInput
                            type="number"
                            step="0.01"
                            min="0"
                            className="mt-1 block w-full"
                            value={
                                taxTouched
                                    ? form.data.tax
                                    : suggestedTax.toFixed(2)
                            }
                            onChange={(e) => {
                                setTaxTouched(true);
                                form.setData("tax", e.target.value);
                            }}
                        />
                    </div>
                    <div>
                        <InputLabel value="Discount" />
                        <TextInput
                            type="number"
                            step="0.01"
                            min="0"
                            className="mt-1 block w-full"
                            value={
                                discountTouched
                                    ? form.data.discount
                                    : suggestedDiscount.toFixed(2)
                            }
                            onChange={(e) => {
                                setDiscountTouched(true);
                                form.setData("discount", e.target.value);
                            }}
                        />
                    </div>
                    <div>
                        <InputLabel value="Total due" />
                        <p className="mt-1 text-2xl font-bold text-indigo-700">
                            {formatPeso(total)}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel value="Due date (optional)" />
                        <TextInput
                            type="date"
                            className="mt-1 block w-full"
                            value={form.data.due_date}
                            onChange={(e) =>
                                form.setData("due_date", e.target.value)
                            }
                        />
                    </div>
                    <div>
                        <InputLabel value="Notes (optional)" />
                        <TextInput
                            className="mt-1 block w-full"
                            value={form.data.notes}
                            onChange={(e) =>
                                form.setData("notes", e.target.value)
                            }
                            placeholder="Invoice notes…"
                        />
                    </div>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={collectPayment}
                            onChange={(e) =>
                                setCollectPayment(e.target.checked)
                            }
                            className="rounded border-gray-300 text-emerald-600"
                        />
                        <span className="text-sm font-medium text-emerald-900">
                            Collect payment now
                        </span>
                    </label>

                    {collectPayment && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div>
                                <InputLabel value="Amount" />
                                <TextInput
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="mt-1 block w-full"
                                    value={form.data.payment.amount}
                                    onChange={(e) =>
                                        form.setData("payment", {
                                            ...form.data.payment,
                                            amount: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Method" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.payment.method}
                                    onChange={(e) =>
                                        form.setData("payment", {
                                            ...form.data.payment,
                                            method: e.target.value,
                                        })
                                    }
                                >
                                    {[
                                        "cash",
                                        "card",
                                        "gcash",
                                        "maya",
                                        "bank_transfer",
                                    ].map((method) => (
                                        <option key={method} value={method}>
                                            {method}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Paid at" />
                                <TextInput
                                    type="datetime-local"
                                    className="mt-1 block w-full"
                                    value={form.data.payment.paid_at}
                                    onChange={(e) =>
                                        form.setData("payment", {
                                            ...form.data.payment,
                                            paid_at: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <PrimaryButton disabled={processing || !canSubmit}>
                        {collectPayment
                            ? "Create Invoice & Collect Payment"
                            : "Create Invoice"}
                    </PrimaryButton>
                    <button
                        type="button"
                        onClick={resetCheckout}
                        className="text-sm text-gray-600 hover:underline"
                    >
                        Reset
                    </button>
                </div>

                {pageErrors.health_record_ids && (
                    <p className="text-sm text-red-600">
                        {pageErrors.health_record_ids}
                    </p>
                )}
                {(pageErrors.clinic_id || pageErrors.client_id) && (
                    <p className="text-sm text-red-600">
                        {pageErrors.clinic_id || pageErrors.client_id}
                    </p>
                )}
            </div>
        </form>
    );
}
