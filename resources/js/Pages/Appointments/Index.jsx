import { useState, useCallback, useEffect, useMemo } from 'react';
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

const SERVICE_TYPE_LABELS = {
    consultation: 'Consultation',
    vaccination: 'Vaccination',
    grooming: 'Grooming',
    medication: 'Medication',
    surgery: 'Surgery',
    boarding: 'Boarding / Hotel',
    emergency_care: 'Emergency Care',
};

const INVENTORY_SERVICE_TYPES = ['vaccination', 'medication'];

const VACCINE_INVENTORY_CATEGORIES = ['vaccine'];

const MEDICATION_INVENTORY_CATEGORIES = ['medicine', 'supplement_vitamin'];

const INVENTORY_CATEGORY_LABELS = {
    vaccine: 'Vaccine',
    medicine: 'Medicine',
    supplement_vitamin: 'Supplement / Vitamin',
};

const defaultServiceTypeForAppointment = (apptType) => {
    const map = {
        checkup: 'consultation',
        vaccination: 'vaccination',
        grooming: 'grooming',
        consultation: 'consultation',
        surgery: 'surgery',
        boarding: 'boarding',
        emergency_care: 'emergency_care',
    };

    return map[apptType] ?? 'consultation';
};

const formatPeso = (v) => `₱${Number(v ?? 0).toFixed(2)}`;

const formatAppointmentStatus = (status) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';

const appointmentBillingSnapshot = (appointment) => {
    const billing = (appointment.billings ?? [])[0];

    if (billing) {
        return {
            status: billing.status,
            invoiceNumber: billing.invoice_number,
            hasActiveInvoice: true,
            isBillingLocked: true,
        };
    }

    if (appointment.billing_status === 'paid') {
        return {
            status: 'paid',
            invoiceNumber: null,
            hasActiveInvoice: false,
            isBillingLocked: true,
        };
    }

    return {
        status: appointment.billing_status ?? null,
        invoiceNumber: null,
        hasActiveInvoice: false,
        isBillingLocked: false,
    };
};

const billingBadgeForAppointment = (appointment, showUnbilled = false) => {
    if (appointment.status !== 'completed') return null;

    const billing = appointmentBillingSnapshot(appointment);

    if (!billing.status) {
        if (!showUnbilled) return null;
        return (
            <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                Not billed
            </span>
        );
    }

    const styles = {
        paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        partial: 'bg-blue-50 text-blue-700 ring-blue-200',
        unpaid: 'bg-gray-50 text-gray-600 ring-gray-200',
    };

    return (
        <span
            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ring-1 ${styles[billing.status] ?? styles.unpaid}`}
            title={billing.invoiceNumber ?? undefined}
        >
            {billing.status === 'unpaid' ? 'Invoiced · unpaid' : billing.status}
        </span>
    );
};

/* ─────────────────────────────── CompleteAppointmentModal ─── */

function CompleteAppointmentModal({ appointment, onClose, onBillNow }) {
    const [processing, setProcessing] = useState(false);

    const complete = (billNow) => {
        setProcessing(true);
        router.put(
            route('appointments.update', appointment.id),
            { ...appointment, status: 'completed' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    if (billNow) onBillNow(appointment.id);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-800">Complete appointment</h3>
                <p className="mt-2 text-sm text-gray-600">
                    Mark{' '}
                    <span className="font-semibold text-gray-800">
                        {appointment.pet?.pet_name ?? 'this pet'}
                    </span>
                    's visit as completed?
                </p>
                <p className="mt-1 text-xs text-gray-500">
                    You can generate the invoice right away, or do it later from the Scheduling page.
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => complete(false)}
                        disabled={processing}
                        className="rounded border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                    >
                        Complete — bill later
                    </button>
                    <button
                        type="button"
                        onClick={() => complete(true)}
                        disabled={processing}
                        className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        Complete &amp; generate invoice
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────── InvoiceModal ─── */

function InvoiceModal({ appointment, serviceTypes, onClose }) {
    const appTimezone = usePage().props.appTimezone ?? 'Asia/Manila';
    const [extraLines, setExtraLines] = useState([]);
    const [applyTax, setApplyTax] = useState(true);
    const [taxRateStr, setTaxRateStr] = useState('12');
    const [discountStr, setDiscountStr] = useState('0');
    const [collectPayment, setCollectPayment] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const paymentForm = useForm({
        amount: '0',
        method: 'cash',
        paid_at: new Date().toISOString().slice(0, 16),
        reference_number: '',
        notes: '',
    });

    const billableRecords = useMemo(
        () =>
            (appointment.health_records ?? []).filter(
                (r) => !r.invoiced_at && Number(r.line_total) > 0,
            ),
        [appointment.health_records],
    );

    const recordSubtotal = billableRecords.reduce((s, r) => s + Number(r.line_total ?? 0), 0);

    const validExtra = useMemo(
        () =>
            extraLines.filter(
                (l) => l.description.trim() && Number(l.unit_price) >= 0,
            ),
        [extraLines],
    );

    const extraSubtotal = validExtra.reduce(
        (s, l) =>
            s + (Number(l.unit_price) || 0) * Math.max(Number(l.quantity) || 1, 1),
        0,
    );

    const subtotal = recordSubtotal + extraSubtotal;
    const taxRate = Number(taxRateStr) || 0;
    const taxAmount = applyTax ? subtotal * (taxRate / 100) : 0;
    const discountAmount = Math.max(Number(discountStr) || 0, 0);
    const total = Math.max(subtotal + taxAmount - discountAmount, 0);

    // Keep payment amount in sync with total
    useEffect(() => {
        paymentForm.setData('amount', total.toFixed(2));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total]);

    const addExtraLine = () =>
        setExtraLines((p) => [
            ...p,
            { id: Date.now(), description: '', quantity: '1', unit_price: '0' },
        ]);

    const removeExtraLine = (id) =>
        setExtraLines((p) => p.filter((l) => l.id !== id));

    const updateExtraLine = (id, field, value) =>
        setExtraLines((p) =>
            p.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
        );

    const submit = (e) => {
        e.preventDefault();
        setSubmitError('');

        if (billableRecords.length === 0 && validExtra.length === 0) {
            setSubmitError(
                'Add at least one service item or extra charge before generating the invoice.',
            );
            return;
        }

        setProcessing(true);

        const payload = {
            client_id: String(appointment.client_id),
            pet_id: String(appointment.pet_id),
            appointment_id: String(appointment.id),
            health_record_ids: billableRecords.map((r) => r.id),
            extra_lines: validExtra.map((l) => ({
                description: l.description,
                quantity: Math.max(Number(l.quantity) || 1, 1),
                unit_price: Number(l.unit_price) || 0,
            })),
            tax: applyTax ? parseFloat(taxAmount.toFixed(2)) : 0,
            discount: parseFloat(discountAmount.toFixed(2)),
        };

        if (collectPayment) {
            payload.collect_payment = true;
            payload.payment = {
                amount: paymentForm.data.amount,
                method: paymentForm.data.method,
                paid_at: paymentForm.data.paid_at,
                reference_number: paymentForm.data.reference_number || null,
                notes: paymentForm.data.notes || null,
            };
        }

        router.post(route('billing.checkout'), payload, {
            onFinish: () => setProcessing(false),
            onError: (errors) => {
                const msgs = Object.values(errors).flat().join(' ');
                setSubmitError(msgs || 'Something went wrong. Please try again.');
            },
        });
    };

    const serviceTypeLabel =
        serviceTypes?.[appointment.type] ?? appointment.type ?? '—';

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between rounded-t-xl border-b px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-800">Generate Invoice</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-2xl leading-none text-gray-400 hover:text-gray-600"
                    >
                        &times;
                    </button>
                </div>

                {/* Appointment summary */}
                <div className="border-b bg-gray-50 px-6 py-3 text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">
                        {appointment.pet?.pet_name ?? '—'}
                    </span>
                    {appointment.client?.name && (
                        <span> &mdash; {appointment.client.name}</span>
                    )}
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-gray-200">
                        {serviceTypeLabel}
                    </span>
                    {appointment.scheduled_at && (
                        <span className="ml-2 text-xs text-gray-400">
                            {formatClinicDateTime(appointment.scheduled_at, appTimezone)}
                        </span>
                    )}
                </div>

                <form onSubmit={submit} className="divide-y">
                    {/* Section 1 — Priced service records */}
                    <div className="px-6 py-4">
                        <h4 className="mb-3 text-sm font-semibold text-gray-700">
                            Services from this visit
                        </h4>

                        {billableRecords.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-gray-500">
                                        <th className="pb-1 text-left font-medium">Service</th>
                                        <th className="pb-1 text-right font-medium">Qty</th>
                                        <th className="pb-1 text-right font-medium">Unit</th>
                                        <th className="pb-1 text-right font-medium">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {billableRecords.map((r) => (
                                        <tr key={r.id}>
                                            <td className="py-2 text-gray-800">{r.title}</td>
                                            <td className="py-2 text-right text-gray-600">
                                                {r.quantity ?? 1}
                                            </td>
                                            <td className="py-2 text-right text-gray-600">
                                                {formatPeso(r.unit_price ?? 0)}
                                            </td>
                                            <td className="py-2 text-right font-medium text-gray-800">
                                                {formatPeso(r.line_total ?? 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                No priced service records found for this visit. Add charges in the
                                section below.
                            </p>
                        )}
                    </div>

                    {/* Section 2 — Extra charges (medications, supplies, etc.) */}
                    <div className="px-6 py-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700">
                                    Additional charges
                                </h4>
                                <p className="text-xs text-gray-500">
                                    Medications, supplies, boarding nights, or any other items not
                                    listed above.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addExtraLine}
                                className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                            >
                                + Add charge
                            </button>
                        </div>

                        {extraLines.length > 0 && (
                            <div className="space-y-2">
                                {extraLines.map((line) => (
                                    <div key={line.id} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Description (e.g. Amoxicillin 250mg × 10 tabs)"
                                            value={line.description}
                                            onChange={(e) =>
                                                updateExtraLine(line.id, 'description', e.target.value)
                                            }
                                            className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            value={line.quantity}
                                            onChange={(e) =>
                                                updateExtraLine(line.id, 'quantity', e.target.value)
                                            }
                                            min="1"
                                            className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={line.unit_price}
                                            onChange={(e) =>
                                                updateExtraLine(line.id, 'unit_price', e.target.value)
                                            }
                                            min="0"
                                            step="0.01"
                                            className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExtraLine(line.id)}
                                            className="text-lg leading-none text-red-400 hover:text-red-600"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 3 — Totals */}
                    <div className="px-6 py-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium">{formatPeso(subtotal)}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex cursor-pointer items-center gap-2 text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={applyTax}
                                        onChange={(e) => setApplyTax(e.target.checked)}
                                        className="rounded"
                                    />
                                    VAT / Tax
                                    {applyTax && (
                                        <>
                                            <input
                                                type="number"
                                                value={taxRateStr}
                                                onChange={(e) => setTaxRateStr(e.target.value)}
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="ml-1 w-16 rounded border border-gray-300 px-2 py-0.5 text-xs"
                                            />
                                            <span className="text-xs">%</span>
                                        </>
                                    )}
                                </label>
                                <span className="font-medium">{formatPeso(taxAmount)}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-gray-600">
                                    Discount (₱)
                                    <input
                                        type="number"
                                        value={discountStr}
                                        onChange={(e) => setDiscountStr(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        className="ml-1 w-24 rounded border border-gray-300 px-2 py-0.5 text-xs"
                                    />
                                </label>
                                <span className="font-medium text-red-600">
                                    {discountAmount > 0 ? `- ${formatPeso(discountAmount)}` : formatPeso(0)}
                                </span>
                            </div>

                            <div className="flex justify-between border-t pt-2 text-base font-bold">
                                <span>Total</span>
                                <span className="text-indigo-700">{formatPeso(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 4 — Collect payment */}
                    <div className="px-6 py-4">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={collectPayment}
                                onChange={(e) => setCollectPayment(e.target.checked)}
                                className="rounded"
                            />
                            Collect payment now
                        </label>

                        {collectPayment && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-600">
                                        Amount (₱)
                                    </label>
                                    <input
                                        type="number"
                                        value={paymentForm.data.amount}
                                        onChange={(e) =>
                                            paymentForm.setData('amount', e.target.value)
                                        }
                                        min="0.01"
                                        step="0.01"
                                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                    />
                                    {paymentForm.errors.amount && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {paymentForm.errors.amount}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600">
                                        Payment method
                                    </label>
                                    <select
                                        value={paymentForm.data.method}
                                        onChange={(e) =>
                                            paymentForm.setData('method', e.target.value)
                                        }
                                        className="mt-1 block w-full rounded border border-gray-300 text-sm"
                                    >
                                        {['cash', 'card', 'gcash', 'maya', 'bank_transfer'].map(
                                            (m) => (
                                                <option key={m} value={m}>
                                                    {m.replace('_', ' ')}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600">
                                        Date &amp; Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={paymentForm.data.paid_at}
                                        onChange={(e) =>
                                            paymentForm.setData('paid_at', e.target.value)
                                        }
                                        className="mt-1 block w-full rounded border border-gray-300 text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-600">
                                        Reference # (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={paymentForm.data.reference_number}
                                        onChange={(e) =>
                                            paymentForm.setData('reference_number', e.target.value)
                                        }
                                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="rounded-b-xl px-6 py-4">
                        {submitError && (
                            <p className="mb-3 text-sm text-red-600">{submitError}</p>
                        )}
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={processing}
                                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    processing ||
                                    (billableRecords.length === 0 && validExtra.length === 0)
                                }
                                className="rounded bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {processing
                                    ? 'Generating…'
                                    : collectPayment
                                      ? 'Generate Invoice & Collect Payment'
                                      : 'Generate Invoice'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─────────────────────────────── AppointmentServicesPanel ─── */

function AppointmentServicesPanel({
    appointment,
    serviceCatalogs,
    inventoryItems = [],
    canAddServices,
    onOpenInvoice,
}) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState(null);

    const healthRecords = appointment.health_records ?? [];
    const billableUnbilled = healthRecords.filter(
        (r) => Number(r.line_total) > 0 && !r.invoiced_at,
    );
    const billableInvoiced = healthRecords.filter(
        (r) => Number(r.line_total) > 0 && r.invoiced_at,
    );
    const clinicalOnly = healthRecords.filter((r) => Number(r.line_total) <= 0);

    const defaultServiceType = defaultServiceTypeForAppointment(appointment.type);

    const typeForCategory = (category) => {
        const valid = [
            'consultation',
            'vaccination',
            'grooming',
            'surgery',
            'boarding',
            'emergency_care',
        ];
        return valid.includes(category) ? category : 'consultation';
    };

    const emptyFormData = () => ({
        type: defaultServiceType,
        title: '',
        description: '',
        record_date: new Date().toISOString().slice(0, 10),
        service_catalog_id: '',
        medicine_id: '',
        unit_price: '0',
        quantity: '1',
    });

    const recordToFormData = (record) => ({
        type: record.type ?? defaultServiceType,
        title: record.title ?? '',
        description: record.description ?? '',
        record_date: record.record_date?.slice?.(0, 10) ?? new Date().toISOString().slice(0, 10),
        service_catalog_id: record.service_catalog_id ? String(record.service_catalog_id) : '',
        medicine_id: record.medicine_id ? String(record.medicine_id) : '',
        unit_price: String(record.unit_price ?? '0'),
        quantity: String(record.medication_quantity ?? record.quantity ?? '1'),
    });

    const form = useForm(emptyFormData());

    const usesInventory = INVENTORY_SERVICE_TYPES.includes(form.data.type);

    const groupedCatalogs = useMemo(() => {
        const groups = {};
        for (const cat of serviceCatalogs) {
            if (!groups[cat.category]) groups[cat.category] = [];
            groups[cat.category].push(cat);
        }
        return groups;
    }, [serviceCatalogs]);

    const filteredInventory = useMemo(() => {
        const categories =
            form.data.type === 'vaccination'
                ? VACCINE_INVENTORY_CATEGORIES
                : MEDICATION_INVENTORY_CATEGORIES;

        return inventoryItems.filter((item) => {
            if (!categories.includes(item.category)) {
                return false;
            }

            if (form.data.type === 'vaccination') {
                return true;
            }

            return Number(item.quantity) > 0;
        });
    }, [inventoryItems, form.data.type]);

    const selectedInventoryItem = useMemo(
        () =>
            inventoryItems.find(
                (item) => String(item.id) === String(form.data.medicine_id),
            ) ?? null,
        [inventoryItems, form.data.medicine_id],
    );

    const categoryLabel = (c) =>
        c.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    const hasBillable = billableUnbilled.length > 0;
    const billingSnapshot = appointmentBillingSnapshot(appointment);
    const hasInvoice = billingSnapshot.isBillingLocked;

    const openAddForm = () => {
        if (hasInvoice) {
            return;
        }
        setEditingRecordId(null);
        form.setData(emptyFormData());
        setShowAddForm(true);
    };

    const startEdit = (record) => {
        setEditingRecordId(record.id);
        form.setData(recordToFormData(record));
        setShowAddForm(true);
    };

    const cancelForm = () => {
        form.reset();
        form.setData(emptyFormData());
        setEditingRecordId(null);
        setShowAddForm(false);
    };

    const deleteRecord = (record) => {
        if (
            !confirm(
                `Remove "${record.title}" from this visit? This cannot be undone.`,
            )
        ) {
            return;
        }

        router.delete(
            route('appointments.destroy-service', [appointment.id, record.id]),
            { preserveScroll: true },
        );
    };

    const onServiceTypeChange = (type) => {
        form.setData({
            ...form.data,
            type,
            title: '',
            service_catalog_id: '',
            medicine_id: '',
            unit_price: '0',
            quantity: '1',
        });
    };

    const onCatalogChange = (catalogId) => {
        const catalog = serviceCatalogs.find((c) => String(c.id) === catalogId);
        form.setData({
            ...form.data,
            service_catalog_id: catalogId,
            medicine_id: '',
            title: catalog?.name ?? '',
            type: typeForCategory(catalog?.category ?? form.data.type),
            unit_price: catalog?.default_price
                ? String(catalog.default_price)
                : '0',
        });
    };

    const onInventoryChange = (medicineId) => {
        const item = inventoryItems.find((m) => String(m.id) === medicineId);
        form.setData({
            ...form.data,
            medicine_id: medicineId,
            service_catalog_id: '',
            title: item?.name ?? '',
            unit_price: item?.unit_price !== undefined && item?.unit_price !== null
                ? String(item.unit_price)
                : '0',
        });
    };

    const submitService = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => cancelForm(),
        };

        if (editingRecordId) {
            form.put(
                route('appointments.update-service', [
                    appointment.id,
                    editingRecordId,
                ]),
                options,
            );
            return;
        }

        form.post(route('appointments.store-service', appointment.id), options);
    };

    return (
        <div className="border-t bg-slate-50 px-6 py-4">
            {/* Services list */}
            {healthRecords.length === 0 && (
                <p className="text-xs text-gray-400">No service records for this visit yet.</p>
            )}

            {billableUnbilled.length > 0 && (
                <div className="mb-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Unbilled services
                    </p>
                    <div className="space-y-1">
                        {billableUnbilled.map((r) => (
                            <div
                                key={r.id}
                                className="flex items-center justify-between gap-2 rounded bg-amber-50 px-3 py-1 text-xs ring-1 ring-amber-200"
                            >
                                <span className="min-w-0 flex-1 text-gray-700">{r.title}</span>
                                <span className="font-medium text-amber-700">
                                    {r.quantity > 1 && `${r.quantity} × `}
                                    ₱{Number(r.line_total).toFixed(2)}
                                </span>
                                {canAddServices && !hasInvoice && (
                                    <span className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(r)}
                                            className="text-indigo-600 hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteRecord(r)}
                                            className="text-red-600 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {billableInvoiced.length > 0 && (
                <div className="mb-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Already invoiced
                    </p>
                    <div className="space-y-1">
                        {billableInvoiced.map((r) => (
                            <div
                                key={r.id}
                                className="flex items-center justify-between rounded bg-gray-100 px-3 py-1 text-xs"
                            >
                                <span className="text-gray-500">{r.title}</span>
                                <span className="text-gray-400">
                                    ₱{Number(r.line_total).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {clinicalOnly.length > 0 && (
                <div className="mb-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Clinical records (not billed)
                    </p>
                    <div className="space-y-1">
                        {clinicalOnly.map((r) => (
                            <div key={r.id} className="text-xs text-gray-400">
                                {r.title}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add service form */}
            {canAddServices && showAddForm && (
                <form
                    onSubmit={submitService}
                    className="mt-3 rounded-lg border border-indigo-200 bg-white p-4"
                >
                    <p className="mb-2 text-xs font-semibold text-indigo-700">
                        {editingRecordId ? 'Edit service item' : 'Add service item'}
                    </p>
                    <div className="mb-2 grid gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-3">
                            <label className="text-xs font-medium text-gray-600">
                                Service type *
                            </label>
                            <select
                                className="mt-0.5 w-full rounded border border-gray-300 text-sm"
                                value={form.data.type}
                                onChange={(e) => onServiceTypeChange(e.target.value)}
                                required
                            >
                                {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {usesInventory ? (
                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-gray-600">
                                    {form.data.type === 'vaccination'
                                        ? 'Vaccine (from inventory) *'
                                        : 'Medicine (from inventory) *'}
                                </label>
                                <select
                                    className="mt-0.5 w-full rounded border border-gray-300 text-sm"
                                    value={form.data.medicine_id}
                                    onChange={(e) => onInventoryChange(e.target.value)}
                                    required
                                >
                                    <option value="">
                                        {filteredInventory.length === 0
                                            ? 'No stock available'
                                            : 'Select item…'}
                                    </option>
                                    {filteredInventory.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} — {item.quantity}{' '}
                                            {item.unit ?? 'unit(s)'} in stock — ₱
                                            {Number(item.unit_price).toFixed(2)} each
                                        </option>
                                    ))}
                                </select>
                                {form.errors.medicine_id && (
                                    <p className="text-xs text-red-500">{form.errors.medicine_id}</p>
                                )}
                                {selectedInventoryItem && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {INVENTORY_CATEGORY_LABELS[selectedInventoryItem.category] ??
                                            selectedInventoryItem.category}
                                        {form.data.type === 'medication' && (
                                            <>
                                                {' '}
                                                · {selectedInventoryItem.quantity}{' '}
                                                {selectedInventoryItem.unit ?? 'unit(s)'} available
                                            </>
                                        )}
                                        {form.data.type === 'vaccination' && (
                                            <>
                                                {' '}
                                                · Stock is deducted in the Vaccinations module
                                            </>
                                        )}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-gray-600">
                                    Service (from catalog) *
                                </label>
                                <select
                                    className="mt-0.5 w-full rounded border border-gray-300 text-sm"
                                    value={form.data.service_catalog_id}
                                    onChange={(e) => onCatalogChange(e.target.value)}
                                    required
                                >
                                    <option value="">Select service…</option>
                                    {Object.entries(groupedCatalogs).map(([cat, items]) => (
                                        <optgroup key={cat} label={categoryLabel(cat)}>
                                            {items.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                    {Number(s.default_price) > 0
                                                        ? ` (₱${Number(s.default_price).toFixed(2)})`
                                                        : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                {form.errors.service_catalog_id && (
                                    <p className="text-xs text-red-500">
                                        {form.errors.service_catalog_id}
                                    </p>
                                )}
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                Unit Price (₱) *
                            </label>
                            <input
                                type="number"
                                value={form.data.unit_price}
                                onChange={(e) => form.setData('unit_price', e.target.value)}
                                min="0"
                                step="0.01"
                                readOnly={usesInventory}
                                className={`mt-0.5 block w-full rounded border border-gray-300 px-2 py-1 text-sm ${
                                    usesInventory ? 'bg-gray-100 text-gray-600' : ''
                                }`}
                            />
                            {usesInventory && (
                                <p className="mt-0.5 text-[10px] text-gray-400">
                                    Price from inventory
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Qty *</label>
                            <input
                                type="number"
                                value={form.data.quantity}
                                onChange={(e) => form.setData('quantity', e.target.value)}
                                min="1"
                                max={
                                    usesInventory &&
                                    form.data.type === 'medication' &&
                                    selectedInventoryItem
                                        ? selectedInventoryItem.quantity
                                        : undefined
                                }
                                className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                            {form.errors.quantity && (
                                <p className="text-xs text-red-500">{form.errors.quantity}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Date *</label>
                            <input
                                type="date"
                                value={form.data.record_date}
                                onChange={(e) => form.setData('record_date', e.target.value)}
                                className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                required
                            />
                            {form.errors.record_date && (
                                <p className="text-xs text-red-500">{form.errors.record_date}</p>
                            )}
                        </div>
                        <div className="sm:col-span-3">
                            <label className="text-xs font-medium text-gray-600">
                                Notes (optional)
                            </label>
                            <input
                                type="text"
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                placeholder="e.g. Rabies vaccine 1 ml, dog"
                                className="mt-0.5 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                        </div>
                    </div>

                    {Object.keys(form.errors).length > 0 && (
                        <div className="mb-2 space-y-1">
                            {Object.values(form.errors).map((err, i) => (
                                <p key={i} className="text-xs text-red-500">
                                    {err}
                                </p>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={
                                form.processing ||
                                (usesInventory
                                    ? !form.data.medicine_id
                                    : !form.data.service_catalog_id)
                            }
                            className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {form.processing
                                ? editingRecordId
                                    ? 'Saving…'
                                    : 'Adding…'
                                : editingRecordId
                                  ? 'Save changes'
                                  : 'Add Service'}
                        </button>
                        <button
                            type="button"
                            onClick={cancelForm}
                            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Action row */}
            <div className="mt-3 flex flex-wrap gap-2">
                {canAddServices && !showAddForm && (
                    <button
                        type="button"
                        onClick={openAddForm}
                        disabled={hasInvoice}
                        title={
                            hasInvoice
                                ? 'An invoice already exists for this visit'
                                : undefined
                        }
                        className={`rounded border px-3 py-1 text-xs font-medium ${
                            hasInvoice
                                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                                : 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50'
                        }`}
                    >
                        + Add Service Item
                    </button>
                )}
                {hasBillable && !hasInvoice && (
                    <button
                        type="button"
                        onClick={onOpenInvoice}
                        className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                        Generate Invoice
                    </button>
                )}
                {hasInvoice && billingSnapshot.hasActiveInvoice && (
                    <span className="rounded bg-emerald-50 px-3 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
                        Invoice #{(appointment.billings ?? [])[0]?.invoice_number ?? '—'}
                    </span>
                )}
                {hasInvoice && !billingSnapshot.hasActiveInvoice && (
                    <span className="rounded bg-emerald-50 px-3 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
                        Paid
                    </span>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────── ClinicPicker ─── */

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
                ? results.filter((c) => c.has_grooming)
                : results.filter((c) => c.has_veterinary);
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
                    <p className="text-base font-semibold text-gray-900">Select Clinic / Salon</p>
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
                            </Link>{' '}
                            to see distances from your location.
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
                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
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
                            Click{' '}
                            <span className="font-medium text-indigo-700">Find Nearest</span>{' '}
                            to see clinics and salons for your selected service.
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

/* ─────────────────────────────── Page component ─── */

export default function AppointmentsIndex({
    appointments,
    pets,
    clients,
    can_manage_status,
    can_add_services = false,
    serviceTypes,
    serviceCatalogs = [],
    inventoryItems = [],
    clientLat,
    clientLng,
    hasLocation,
}) {
    const appTimezone = usePage().props.appTimezone ?? 'Asia/Manila';
    const auth = usePage().props.auth;
    const isCustomer = auth?.user?.role === 'customer';

    const [completingAppointment, setCompletingAppointment] = useState(null);
    const [invoicingAppointmentId, setInvoicingAppointmentId] = useState(null);
    const [openServicesId, setOpenServicesId] = useState(null);

    // After Inertia re-renders (e.g. after completing appointment), find the updated record
    const invoicingAppointment = useMemo(
        () =>
            invoicingAppointmentId
                ? (appointments.find((a) => a.id === invoicingAppointmentId) ?? null)
                : null,
        [appointments, invoicingAppointmentId],
    );

    const form = useForm({
        clinic_id: '',
        pet_id: '',
        client_id: '',
        scheduled_at: '',
        type: 'checkup',
        status: 'scheduled',
        notes: '',
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
        form.setData({ ...form.data, type, clinic_id: '' });
        form.clearErrors('clinic_id');
    };

    const labelFor = (type) => serviceTypes?.[type] ?? type;

    const toggleServicesPanel = (appointmentId) =>
        setOpenServicesId((prev) => (prev === appointmentId ? null : appointmentId));

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800">Scheduling</h2>}
        >
            <Head title="Appointments" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    {/* Schedule form */}
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
                                {form.errors.pet_id && (
                                    <p className="mt-1 text-xs text-red-500">{form.errors.pet_id}</p>
                                )}
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
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <InputError className="mt-1" message={form.errors.type} />
                            </div>
                        </div>

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
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
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

                    {/* Appointments table */}
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Pet</th>
                                    <th className="px-4 py-3 text-left">Pet Owner</th>
                                    <th className="px-4 py-3 text-left">Clinic</th>
                                    <th className="px-4 py-3 text-left">When</th>
                                    <th className="px-4 py-3 text-left">Service</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visibleAppointments.map((a) => (
                                    <>
                                        <tr key={a.id}>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleServicesPanel(a.id)}
                                                    className="text-left hover:underline"
                                                    title="Toggle services panel"
                                                >
                                                    {a.pet?.pet_name}
                                                </button>
                                                {(a.health_records ?? []).length > 0 && (
                                                    <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                                        {a.health_records.length}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {a.client?.name ?? a.pet?.client?.name ?? (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {a.clinic?.name ?? <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {formatClinicDateTime(a.scheduled_at, appTimezone)}
                                            </td>
                                            <td className="px-4 py-3">{labelFor(a.type)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col items-start">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${
                                                            appointmentStatusStyles[a.status] ??
                                                            'bg-gray-50 text-gray-700 ring-gray-100'
                                                        }`}
                                                    >
                                                        {formatAppointmentStatus(a.status)}
                                                    </span>
                                                    {billingBadgeForAppointment(a, can_manage_status)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {can_manage_status && a.status === 'scheduled' && (
                                                    <button
                                                        onClick={() => setCompletingAppointment(a)}
                                                        className="text-green-600 hover:underline"
                                                    >
                                                        Complete
                                                    </button>
                                                )}
                                                {can_manage_status &&
                                                    a.status === 'completed' &&
                                                    !appointmentBillingSnapshot(a).isBillingLocked && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setInvoicingAppointmentId(a.id)
                                                            }
                                                            className="text-indigo-600 hover:underline"
                                                        >
                                                            Bill visit
                                                        </button>
                                                    )}
                                                {a.status === 'scheduled' && (
                                                    <button
                                                        onClick={() =>
                                                            confirm(
                                                                'Cancel this appointment?',
                                                            ) &&
                                                            router.delete(
                                                                route(
                                                                    'appointments.destroy',
                                                                    a.id,
                                                                ),
                                                            )
                                                        }
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

                                        {/* Services panel (expandable) */}
                                        {openServicesId === a.id && (
                                            <tr key={`services-${a.id}`}>
                                                <td colSpan={7} className="p-0">
                                                    <AppointmentServicesPanel
                                                        appointment={a}
                                                        serviceCatalogs={serviceCatalogs}
                                                        inventoryItems={inventoryItems}
                                                        canAddServices={can_add_services}
                                                        onOpenInvoice={() =>
                                                            setInvoicingAppointmentId(a.id)
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </>
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

            {/* Modals */}
            {completingAppointment && (
                <CompleteAppointmentModal
                    appointment={completingAppointment}
                    onClose={() => setCompletingAppointment(null)}
                    onBillNow={(id) => setInvoicingAppointmentId(id)}
                />
            )}

            {invoicingAppointment && (
                <InvoiceModal
                    appointment={invoicingAppointment}
                    serviceTypes={serviceTypes}
                    onClose={() => setInvoicingAppointmentId(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}
