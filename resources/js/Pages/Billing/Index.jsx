import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import ListDisplayControls from "@/Components/ListDisplayControls";
import useListDisplayLimit from "@/hooks/useListDisplayLimit";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { clinicScopeSubtitle, clinicScopeTitle } from "@/utils/clinicScope";
import { formatClinicDate } from "@/utils/formatDateTime";

const paymentMethods = ["cash", "card", "gcash", "maya", "bank_transfer"];
const billingStatuses = ["unpaid", "partial", "paid", "cancelled"];

const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const SERVICE_LABELS = {
    checkup: "Checkup",
    vaccination: "Vaccination",
    grooming: "Grooming",
    consultation: "Consultation",
    surgery: "Surgery",
    boarding: "Boarding / Hotel",
    emergency_care: "Emergency Care",
    other: "Other",
};

const formatAppointmentOption = (appt) => {
    const petName = (appt.pet?.pet_name ?? "Unknown pet").toUpperCase();
    const service =
        appt.service_label ??
        SERVICE_LABELS[appt.service_type] ??
        SERVICE_LABELS[appt["type"]] ??
        "Other";
    const date = formatClinicDate(appt.scheduled_at) ?? "No date";

    return `${petName} - ${date}(${service})`;
};

const billingMatchesSearch = (billing, query) => {
    const haystack = [
        billing.invoice_number,
        billing.client?.name,
        billing.pet?.pet_name,
        billing.service_catalog?.name,
        billing.status,
        billing.notes,
        ...(billing.line_items ?? []).map((item) => item.description),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return haystack.includes(query);
};

function StatCard({ label, value, accent = "indigo" }) {
    const accents = {
        indigo: "border-indigo-100 bg-indigo-50 text-indigo-800",
        emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
        amber: "border-amber-100 bg-amber-50 text-amber-800",
        violet: "border-violet-100 bg-violet-50 text-violet-800",
    };

    return (
        <div
            className={`rounded-xl border p-5 shadow-sm ${accents[accent] ?? accents.indigo}`}
        >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {label}
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

function BarChart({ items, valueKey = "revenue" }) {
    const max = Math.max(
        ...items.map((item) => Number(item[valueKey] ?? 0)),
        1,
    );

    if (items.length === 0) {
        return (
            <p className="text-sm text-gray-400">No data for this period.</p>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                        <span>{item.label}</span>
                        <span className="font-medium">
                            {valueKey === "revenue"
                                ? formatPeso(item.revenue)
                                : item.orders}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                                width: `${(Number(item[valueKey] ?? 0) / max) * 100}%`,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ServiceRow({ service, rank }) {
    return (
        <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 text-xs text-gray-400">{rank}</td>
            <td className="px-4 py-2 text-sm font-medium text-gray-800">
                {service.name}
            </td>
            <td className="px-4 py-2 text-xs capitalize text-gray-500">
                {service.category}
            </td>
            <td className="px-4 py-2 text-right text-sm font-semibold text-gray-800">
                {Number(service.total_qty).toLocaleString()}
            </td>
            <td className="px-4 py-2 text-right text-sm text-gray-700">
                {formatPeso(service.total_revenue)}
            </td>
        </tr>
    );
}

function DeleteInvoiceModal({ billing, isPlatformAdmin, onClose }) {
    const form = useForm({ password: "" });

    const submit = (e) => {
        e.preventDefault();
        form.delete(route("billing.destroy", billing.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    const passwordLabel = isPlatformAdmin
        ? "Confirm your super admin password *"
        : "Confirm your clinic owner password *";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-800">
                    Delete invoice
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                    You are about to permanently delete invoice{" "}
                    <span className="font-semibold text-gray-800">
                        {billing.invoice_number}
                    </span>
                    . This action cannot be undone.
                </p>
                <form onSubmit={submit} className="mt-4 space-y-4">
                    <div>
                        <label
                            htmlFor="delete_invoice_password"
                            className="block text-xs font-medium text-gray-600"
                        >
                            {passwordLabel}
                        </label>
                        <input
                            id="delete_invoice_password"
                            type="password"
                            autoFocus
                            autoComplete="current-password"
                            className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            value={form.data.password}
                            onChange={(e) =>
                                form.setData("password", e.target.value)
                            }
                        />
                        {form.errors.password && (
                            <p className="mt-1 text-xs text-red-500">
                                {form.errors.password}
                            </p>
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
                            {form.processing ? "Deleting…" : "Delete invoice"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BillingIndex({
    billings,
    clients = [],
    pets = [],
    appointments = [],
    serviceCatalogs = [],
    can_manage_billing = true,
    can_delete_billing = false,
    requires_clinic_context = false,
    summary = {},
    salesTrend = [],
    categoryRevenue = [],
    paymentMethodStats = [],
    topCustomers = [],
    zeroSales = [],
    outstanding = [],
    reportData = {},
    filters = {},
    periods = [],
}) {
    const activeClinic = usePage().props.activeClinic;
    const isPlatformAdmin = usePage().props.isPlatformAdmin ?? false;
    const [editing, setEditing] = useState(null);
    const [payingBillingId, setPayingBillingId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [saleTypeFilter, setSaleTypeFilter] = useState("clinic_service");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? "");
    const [dateTo, setDateTo] = useState(filters.date_to ?? "");
    const [exportingCsv, setExportingCsv] = useState(false);

    const reportQueryParams = () => {
        const params = { period: filters.period ?? "monthly" };
        if (dateFrom && dateTo) {
            params.date_from = dateFrom;
            params.date_to = dateTo;
        }
        return params;
    };

    const applyReportFilters = () => {
        router.get(route("billing.index"), reportQueryParams(), {
            preserveState: true,
        });
    };

    const changeReportPeriod = (period) => {
        router.get(
            route("billing.index"),
            {
                period,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true },
        );
    };

    const clearReportDateRange = () => {
        setDateFrom("");
        setDateTo("");
        router.get(
            route("billing.index"),
            { period: filters.period ?? "monthly" },
            { preserveState: true },
        );
    };

    const exportUrl = route("billing.export", reportQueryParams());

    const handleExportCsv = async () => {
        if (exportingCsv) {
            return;
        }

        setExportingCsv(true);

        try {
            const response = await window.axios.get(exportUrl, {
                responseType: "blob",
            });

            const contentType = response.headers["content-type"] ?? "";
            if (!contentType.includes("text/csv")) {
                window.location.assign(exportUrl);
                return;
            }

            const disposition = response.headers["content-disposition"] ?? "";
            const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
            const filename =
                filenameMatch?.[1] ??
                `clinic-billing-report-${new Date().toISOString().slice(0, 10)}.csv`;

            const blob = new Blob([response.data], { type: "text/csv" });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch {
            window.location.assign(exportUrl);
        } finally {
            setExportingCsv(false);
        }
    };

    const periodEntries = Object.entries(reportData ?? {});
    const hasReportData =
        Number(summary?.total_orders ?? 0) > 0 || periodEntries.length > 0;
    const showReports = !requires_clinic_context;

    const filteredBillings = useMemo(() => {
        const query = search.trim().toLowerCase();

        return billings.filter((billing) => {
            const saleType = billing.sale_type ?? "clinic_service";

            if (saleTypeFilter !== "all" && saleType !== saleTypeFilter) {
                return false;
            }

            if (statusFilter && billing.status !== statusFilter) {
                return false;
            }

            if (query && !billingMatchesSearch(billing, query)) {
                return false;
            }

            return true;
        });
    }, [billings, saleTypeFilter, statusFilter, search]);

    const hasActiveFilters = Boolean(
        search || statusFilter || saleTypeFilter !== "all",
    );

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("");
        setSaleTypeFilter("all");
    };

    const {
        visibleItems: visibleBillings,
        displayLimit,
        setDisplayLimit,
        totalCount: billingListCount,
        showingCount: billingShowingCount,
    } = useListDisplayLimit(filteredBillings);

    const form = useForm({
        client_id: "",
        pet_id: "",
        appointment_id: "",
        service_catalog_id: "",
        service_unit_price: "0",
        service_quantity: "1",
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
        if (!editing) return;
        form.put(route("billing.update", editing), {
            onSuccess: resetForm,
        });
    };

    const startEdit = (billing) => {
        if (billing.status === "paid" || billing.status === "cancelled") {
            return;
        }

        setEditing(billing.id);
        form.setData({
            client_id: String(billing.client_id),
            pet_id: billing.pet_id ? String(billing.pet_id) : "",
            appointment_id: billing.appointment_id
                ? String(billing.appointment_id)
                : "",
            service_catalog_id: billing.service_catalog_id
                ? String(billing.service_catalog_id)
                : "",
            service_unit_price: String(billing.service_unit_price ?? "0"),
            service_quantity: String(billing.service_quantity ?? "1"),
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
        form.setData("service_quantity", "1");
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

    const linkedAppointmentIds = useMemo(
        () =>
            new Set(
                billings
                    .filter(
                        (billing) =>
                            billing.appointment_id &&
                            billing.status !== "cancelled" &&
                            (!editing || billing.id !== editing.id),
                    )
                    .map((billing) => Number(billing.appointment_id)),
            ),
        [billings, editing],
    );

    const filteredAppointments = useMemo(() => {
        let list = appointments.filter((appt) => {
            const appointmentId = Number(appt.id);
            const isSelectedDuringEdit =
                form.data.appointment_id &&
                String(appt.id) === form.data.appointment_id;

            if (appt.status !== "completed" && !isSelectedDuringEdit) {
                return false;
            }

            if (
                linkedAppointmentIds.has(appointmentId) &&
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
        linkedAppointmentIds,
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

        const matchedService = serviceCatalogs.find(
            (service) => String(service.code) === String(selected.service_type),
        );

        const nextData = {
            ...form.data,
            appointment_id: appointmentId,
            client_id: String(selected.client_id),
            pet_id: String(selected.pet_id),
        };

        if (matchedService) {
            const unitPrice = String(matchedService.default_price ?? "0");
            const quantity = form.data.service_quantity || "1";
            nextData.service_catalog_id = String(matchedService.id);
            nextData.service_unit_price = unitPrice;
            nextData.service_quantity = quantity;
            nextData.subtotal = recalculateSubtotal(unitPrice, quantity);
        }

        form.setData(nextData);
    };

    const deleteAppointment = (appt) => {
        if (
            !confirm(
                `Are you sure you want to delete this appointment?\n\n${formatAppointmentOption(appt)}`,
            )
        ) {
            return;
        }

        router.delete(route("appointments.destroy", appt.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (String(form.data.appointment_id) === String(appt.id)) {
                    form.setData({
                        ...form.data,
                        appointment_id: "",
                    });
                }
            },
        });
    };

    const recalculateSubtotal = (unitPrice, quantity) => {
        const safePrice = Number(unitPrice) || 0;
        const safeQty = Number(quantity) || 0;
        return (safePrice * safeQty).toFixed(2);
    };

    const onServiceCatalogChange = (serviceCatalogId) => {
        if (!serviceCatalogId) {
            form.setData({
                ...form.data,
                service_catalog_id: "",
                service_unit_price: "0",
                service_quantity: "1",
                subtotal: "0.00",
            });
            return;
        }

        const selectedService = serviceCatalogs.find(
            (service) => String(service.id) === serviceCatalogId,
        );
        if (!selectedService) {
            form.setData("service_catalog_id", serviceCatalogId);
            return;
        }

        const unitPrice = String(selectedService.default_price ?? "0");
        const quantity = form.data.service_quantity || "1";
        form.setData({
            ...form.data,
            service_catalog_id: serviceCatalogId,
            service_unit_price: unitPrice,
            subtotal: recalculateSubtotal(unitPrice, quantity),
        });
    };

    const onServiceQuantityOrPriceChange = (field, value) => {
        const nextData = {
            ...form.data,
            [field]: value,
        };
        const unitPrice =
            field === "service_unit_price"
                ? value
                : nextData.service_unit_price;
        const quantity =
            field === "service_quantity" ? value : nextData.service_quantity;
        nextData.subtotal = recalculateSubtotal(unitPrice, quantity);
        form.setData(nextData);
    };

    const hasSelectedService = Boolean(form.data.service_catalog_id);

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                        {clinicScopeTitle(
                            "Billing & Payments",
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
            <Head title="Billing" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    {requires_clinic_context && (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            Select an active clinic from the header to view
                            invoices and payments for your clinic. To generate a
                            new invoice, go to{" "}
                            <a
                                href={route("appointments.index")}
                                className="font-medium underline"
                            >
                                Scheduling
                            </a>{" "}
                            and click <strong>Bill visit</strong> on a completed
                            appointment.
                        </div>
                    )}

                    {showReports && (
                        <div className="mb-8">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800">
                                    Billing Reports
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleExportCsv}
                                    disabled={exportingCsv}
                                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {exportingCsv ? "Exporting…" : "Export CSV"}
                                </button>
                            </div>

                            <div className="mb-6 flex flex-wrap gap-2">
                                {periods.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() =>
                                            changeReportPeriod(p.value)
                                        }
                                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                                            (filters.period ?? "monthly") ===
                                            p.value
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white text-gray-600 shadow hover:bg-indigo-50"
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-6 rounded-lg bg-white p-4 shadow">
                                <p className="mb-3 text-sm font-semibold text-gray-700">
                                    Custom date range
                                </p>
                                <div className="flex flex-wrap items-end gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs text-gray-500">
                                            From
                                        </label>
                                        <TextInput
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) =>
                                                setDateFrom(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-gray-500">
                                            To
                                        </label>
                                        <TextInput
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) =>
                                                setDateTo(e.target.value)
                                            }
                                        />
                                    </div>
                                    <PrimaryButton
                                        type="button"
                                        onClick={applyReportFilters}
                                    >
                                        Apply
                                    </PrimaryButton>
                                    {(filters.date_from || filters.date_to) && (
                                        <button
                                            type="button"
                                            onClick={clearReportDateRange}
                                            className="text-sm text-gray-500 hover:text-gray-700"
                                        >
                                            Clear range
                                        </button>
                                    )}
                                </div>
                                {filters.using_custom_range && (
                                    <p className="mt-2 text-xs text-indigo-600">
                                        Filtering by custom date range. Service
                                        movement shows combined totals for this
                                        range.
                                    </p>
                                )}
                            </div>

                            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <StatCard
                                    label="Total Revenue"
                                    value={formatPeso(summary?.total_revenue)}
                                    accent="emerald"
                                />
                                <StatCard
                                    label="Paid Invoices"
                                    value={Number(
                                        summary?.total_orders ?? 0,
                                    ).toLocaleString()}
                                    accent="indigo"
                                />
                                <StatCard
                                    label="Line Items"
                                    value={Number(
                                        summary?.units_sold ?? 0,
                                    ).toLocaleString()}
                                    accent="violet"
                                />
                                <StatCard
                                    label="Avg Invoice Value"
                                    value={formatPeso(summary?.avg_order_value)}
                                    accent="amber"
                                />
                            </div>

                            {!hasReportData && (
                                <div className="mb-6 rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow">
                                    No paid clinic invoices found for this
                                    period.
                                </div>
                            )}

                            {hasReportData && (
                                <div className="mb-6 space-y-6">
                                    <div className="grid gap-6 lg:grid-cols-2">
                                        <div className="rounded-lg bg-white p-5 shadow">
                                            <h4 className="mb-4 font-semibold text-gray-800">
                                                Revenue Trend
                                            </h4>
                                            <BarChart
                                                items={salesTrend}
                                                valueKey="revenue"
                                            />
                                        </div>
                                        <div className="rounded-lg bg-white p-5 shadow">
                                            <h4 className="mb-4 font-semibold text-gray-800">
                                                Revenue by Service Type
                                            </h4>
                                            {categoryRevenue.length === 0 ? (
                                                <p className="text-sm text-gray-400">
                                                    No category data.
                                                </p>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead className="text-xs text-gray-500">
                                                        <tr>
                                                            <th className="py-2 text-left">
                                                                Category
                                                            </th>
                                                            <th className="py-2 text-right">
                                                                Units
                                                            </th>
                                                            <th className="py-2 text-right">
                                                                Revenue
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {categoryRevenue.map(
                                                            (row) => (
                                                                <tr
                                                                    key={
                                                                        row.category
                                                                    }
                                                                >
                                                                    <td className="py-2 font-medium text-gray-800">
                                                                        {
                                                                            row.label
                                                                        }
                                                                    </td>
                                                                    <td className="py-2 text-right">
                                                                        {
                                                                            row.units
                                                                        }
                                                                    </td>
                                                                    <td className="py-2 text-right">
                                                                        {formatPeso(
                                                                            row.revenue,
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid gap-6 lg:grid-cols-2">
                                        <div className="rounded-lg bg-white p-5 shadow">
                                            <h4 className="mb-4 font-semibold text-gray-800">
                                                Payment Methods
                                            </h4>
                                            {paymentMethodStats.length === 0 ? (
                                                <p className="text-sm text-gray-400">
                                                    No payments recorded.
                                                </p>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead className="text-xs text-gray-500">
                                                        <tr>
                                                            <th className="py-2 text-left">
                                                                Method
                                                            </th>
                                                            <th className="py-2 text-right">
                                                                Count
                                                            </th>
                                                            <th className="py-2 text-right">
                                                                Amount
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {paymentMethodStats.map(
                                                            (row) => (
                                                                <tr
                                                                    key={
                                                                        row.method
                                                                    }
                                                                >
                                                                    <td className="py-2 font-medium text-gray-800">
                                                                        {
                                                                            row.label
                                                                        }
                                                                    </td>
                                                                    <td className="py-2 text-right">
                                                                        {
                                                                            row.count
                                                                        }
                                                                    </td>
                                                                    <td className="py-2 text-right">
                                                                        {formatPeso(
                                                                            row.amount,
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                        <div className="rounded-lg bg-white p-5 shadow">
                                            <h4 className="mb-4 font-semibold text-gray-800">
                                                Top Customers
                                            </h4>
                                            {topCustomers.length === 0 ? (
                                                <p className="text-sm text-gray-400">
                                                    No customer data.
                                                </p>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead className="text-xs text-gray-500">
                                                        <tr>
                                                            <th className="py-2 text-left">
                                                                Customer
                                                            </th>
                                                            <th className="py-2 text-right">
                                                                Invoices
                                                            </th>
                                                            <th className="py-2 text-right">
                                                                Revenue
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {topCustomers.map(
                                                            (row) => (
                                                                <tr
                                                                    key={
                                                                        row.client_id
                                                                    }
                                                                >
                                                                    <td className="py-2 font-medium text-gray-800">
                                                                        {
                                                                            row.name
                                                                        }
                                                                    </td>
                                                                    <td className="py-2 text-right">
                                                                        {
                                                                            row.orders
                                                                        }
                                                                    </td>
                                                                    <td className="py-2 text-right">
                                                                        {formatPeso(
                                                                            row.revenue,
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>

                                    {(outstanding.length > 0 ||
                                        zeroSales.length > 0) && (
                                        <div className="grid gap-6 lg:grid-cols-2">
                                            {outstanding.length > 0 && (
                                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
                                                    <h4 className="mb-3 font-semibold text-amber-900">
                                                        Outstanding Invoices
                                                    </h4>
                                                    <p className="mb-3 text-xs text-amber-800">
                                                        Unpaid or partially paid
                                                        invoices requiring
                                                        follow-up.
                                                    </p>
                                                    <ul className="space-y-2 text-sm">
                                                        {outstanding.map(
                                                            (item) => (
                                                                <li
                                                                    key={
                                                                        item.id
                                                                    }
                                                                    className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2"
                                                                >
                                                                    <span className="font-medium text-gray-800">
                                                                        {
                                                                            item.invoice_number
                                                                        }{" "}
                                                                        ·{" "}
                                                                        {
                                                                            item.client_name
                                                                        }
                                                                    </span>
                                                                    <span className="text-xs text-amber-800">
                                                                        {formatPeso(
                                                                            item.balance,
                                                                        )}{" "}
                                                                        ·{" "}
                                                                        {
                                                                            item.status
                                                                        }
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                            {/* {zeroSales.length > 0 && (
                                                <div className="rounded-lg bg-white p-5 shadow">
                                                    <h4 className="mb-3 font-semibold text-gray-800">
                                                        No Sales in Period
                                                    </h4>
                                                    <p className="mb-3 text-xs text-gray-500">
                                                        Catalog services with no
                                                        billed activity in the
                                                        selected period.
                                                    </p>
                                                    <ul className="space-y-2 text-sm">
                                                        {zeroSales.map(
                                                            (item) => (
                                                                <li
                                                                    key={
                                                                        item.id
                                                                    }
                                                                    className="flex items-center justify-between border-b border-gray-100 pb-2"
                                                                >
                                                                    <span className="font-medium text-gray-800">
                                                                        {
                                                                            item.name
                                                                        }
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {
                                                                            item.category
                                                                        }
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                </div>
                                            )} */}
                                        </div>
                                    )}

                                    {/* {periodEntries.map(([label, data]) => (
                                        <div
                                            key={label}
                                            className="overflow-hidden rounded-lg bg-white shadow"
                                        >
                                            <div className="border-b bg-gray-50 px-5 py-3">
                                                <h4 className="font-semibold text-gray-700">
                                                    Period: {label}
                                                </h4>
                                            </div>
                                            <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 divide-gray-100">
                                                <div>
                                                    <div className="bg-green-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-700">
                                                        Top Services (Top 10)
                                                    </div>
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-50 text-xs text-gray-500">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">
                                                                    #
                                                                </th>
                                                                <th className="px-4 py-2 text-left">
                                                                    Service
                                                                </th>
                                                                <th className="px-4 py-2 text-left">
                                                                    Type
                                                                </th>
                                                                <th className="px-4 py-2 text-right">
                                                                    Qty
                                                                </th>
                                                                <th className="px-4 py-2 text-right">
                                                                    Revenue
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {(
                                                                data.fast_moving ??
                                                                []
                                                            ).map((s, i) => (
                                                                <ServiceRow
                                                                    key={`${s.name}-${label}`}
                                                                    service={s}
                                                                    rank={i + 1}
                                                                />
                                                            ))}
                                                            {(
                                                                data.fast_moving ??
                                                                []
                                                            ).length === 0 && (
                                                                <tr>
                                                                    <td
                                                                        colSpan={
                                                                            5
                                                                        }
                                                                        className="px-4 py-3 text-center text-xs text-gray-400"
                                                                    >
                                                                        No data
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div>
                                                    <div className="bg-red-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-red-700">
                                                        Low Volume (Bottom 10)
                                                    </div>
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-50 text-xs text-gray-500">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">
                                                                    #
                                                                </th>
                                                                <th className="px-4 py-2 text-left">
                                                                    Service
                                                                </th>
                                                                <th className="px-4 py-2 text-left">
                                                                    Type
                                                                </th>
                                                                <th className="px-4 py-2 text-right">
                                                                    Qty
                                                                </th>
                                                                <th className="px-4 py-2 text-right">
                                                                    Revenue
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {(
                                                                data.slow_moving ??
                                                                []
                                                            ).map((s, i) => (
                                                                <ServiceRow
                                                                    key={`${s.name}-slow-${label}`}
                                                                    service={s}
                                                                    rank={i + 1}
                                                                />
                                                            ))}
                                                            {(
                                                                data.slow_moving ??
                                                                []
                                                            ).length === 0 && (
                                                                <tr>
                                                                    <td
                                                                        colSpan={
                                                                            5
                                                                        }
                                                                        className="px-4 py-3 text-center text-xs text-gray-400"
                                                                    >
                                                                        No data
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    ))} */}
                                </div>
                            )}
                        </div>
                    )}

                    <h3 className="mb-4 text-lg font-semibold text-gray-800">
                        Invoices
                    </h3>

                    <div className="mb-6 flex flex-wrap gap-2">
                        {[
                            { value: "all", label: "All invoices" },
                            {
                                value: "clinic_service",
                                label: "Clinic services",
                            },
                            // {
                            //     value: "pet_shop_retail",
                            //     label: "Pet shop sales",
                            // },
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setSaleTypeFilter(option.value)}
                                className={`rounded-full px-3 py-1 text-sm font-medium ${
                                    saleTypeFilter === option.value
                                        ? "bg-indigo-600 text-white"
                                        : "bg-white text-gray-700 shadow ring-1 ring-gray-200 hover:bg-gray-50"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {can_manage_billing && editing && (
                        <form
                            onSubmit={submit}
                            className="mb-6 rounded-lg bg-white p-6 shadow"
                        >
                            <h3 className="mb-4 font-semibold">Edit Invoice</h3>
                            <div className="sm:col-span-3">
                                <InputLabel value="Appointment" />
                                <div className="mt-1 flex items-center gap-2">
                                    <select
                                        className="w-full rounded-md border-gray-300"
                                        value={form.data.appointment_id}
                                        onChange={(e) =>
                                            onAppointmentChange(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            No linked appointment
                                        </option>
                                        {filteredAppointments.length === 0 ? (
                                            <option value="" disabled>
                                                No completed appointments for
                                                this clinic
                                            </option>
                                        ) : (
                                            filteredAppointments.map((appt) => (
                                                <option
                                                    key={appt.id}
                                                    value={String(appt.id)}
                                                >
                                                    {formatAppointmentOption(
                                                        appt,
                                                    )}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {selectedAppointment && (
                                        <button
                                            type="button"
                                            title="Delete appointment"
                                            aria-label={`Delete appointment for ${selectedAppointment.pet?.pet_name ?? "pet"}`}
                                            onClick={() =>
                                                deleteAppointment(
                                                    selectedAppointment,
                                                )
                                            }
                                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg leading-none text-gray-500 ring-1 ring-gray-300 hover:bg-red-50 hover:text-red-600"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                <div>
                                    <InputLabel value="Service" />
                                    <select
                                        className="mt-1 w-full rounded-md border-gray-300"
                                        value={form.data.service_catalog_id}
                                        onChange={(e) =>
                                            onServiceCatalogChange(
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">Select service</option>
                                        {serviceCatalogs.map((service) => (
                                            <option
                                                key={service.id}
                                                value={service.id}
                                            >
                                                {service.name} (
                                                {service.category})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <InputLabel value="Qty" />
                                    <TextInput
                                        type="number"
                                        min="1"
                                        className="mt-1 block w-full"
                                        value={form.data.service_quantity}
                                        onChange={(e) =>
                                            onServiceQuantityOrPriceChange(
                                                "service_quantity",
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Unit Price" />
                                    <TextInput
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="mt-1 block w-full"
                                        value={form.data.service_unit_price}
                                        onChange={(e) =>
                                            onServiceQuantityOrPriceChange(
                                                "service_unit_price",
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
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
                                            form.setData(
                                                "pet_id",
                                                e.target.value,
                                            )
                                        }
                                        disabled={Boolean(selectedAppointment)}
                                    >
                                        <option value="">No linked pet</option>
                                        {filteredPets.map((pet) => (
                                            <option key={pet.id} value={pet.id}>
                                                {pet.pet_name} (
                                                {pet.client?.name})
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
                                            form.setData(
                                                "subtotal",
                                                e.target.value,
                                            )
                                        }
                                        disabled={hasSelectedService}
                                        required
                                    />
                                    {hasSelectedService && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            Auto-calculated from selected
                                            service price and quantity.
                                        </p>
                                    )}
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
                                            form.setData(
                                                "discount",
                                                e.target.value,
                                            )
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
                                            form.setData(
                                                "due_date",
                                                e.target.value,
                                            )
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
                                                <option
                                                    key={status}
                                                    value={status}
                                                >
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
                                            form.setData(
                                                "notes",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                                <PrimaryButton disabled={form.processing}>
                                    Save Changes
                                </PrimaryButton>
                                <button
                                    type="button"
                                    className="text-sm text-gray-600 hover:underline"
                                    onClick={resetForm}
                                >
                                    Cancel edit
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mb-6 rounded-lg bg-white p-4 shadow">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <InputLabel value="Search" />
                                <TextInput
                                    type="search"
                                    className="mt-1 block w-full"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Invoice, client, pet, service, or product..."
                                />
                            </div>
                            <div>
                                <InputLabel value="Status" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                >
                                    <option value="">All statuses</option>
                                    {billingStatuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status.charAt(0).toUpperCase() +
                                                status.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                            <p className="text-gray-500">
                                Showing {filteredBillings.length} of{" "}
                                {billings.length} invoices
                            </p>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-indigo-600 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>

                    {can_manage_billing && payingBillingId && (
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
                                        Customer
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Details
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
                                {visibleBillings.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-8 text-center text-gray-500"
                                        >
                                            {billings.length === 0
                                                ? "No invoices yet."
                                                : "No invoices match your filters."}
                                        </td>
                                    </tr>
                                ) : (
                                    visibleBillings.map((billing) => {
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
                                                    {(billing.sale_type ??
                                                        "clinic_service") ===
                                                    "pet_shop_retail" ? (
                                                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                                                            Pet shop
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                                            Clinic
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {(billing.sale_type ??
                                                        "clinic_service") ===
                                                    "pet_shop_retail" ? (
                                                        <div className="space-y-1">
                                                            {(
                                                                billing.line_items ??
                                                                []
                                                            ).length === 0 ? (
                                                                <span className="text-gray-500">
                                                                    Retail sale
                                                                </span>
                                                            ) : (
                                                                billing.line_items.map(
                                                                    (item) => (
                                                                        <p
                                                                            key={
                                                                                item.id
                                                                            }
                                                                            className="text-xs text-gray-600"
                                                                        >
                                                                            {
                                                                                item.description
                                                                            }{" "}
                                                                            —
                                                                            Qty{" "}
                                                                            {
                                                                                item.quantity
                                                                            }{" "}
                                                                            x{" "}
                                                                            {formatPeso(
                                                                                item.unit_price,
                                                                            )}
                                                                        </p>
                                                                    ),
                                                                )
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {(
                                                                billing.line_items ??
                                                                []
                                                            ).length > 0 ? (
                                                                billing.line_items.map(
                                                                    (item) => (
                                                                        <p
                                                                            key={
                                                                                item.id
                                                                            }
                                                                            className="text-xs text-gray-600"
                                                                        >
                                                                            {
                                                                                item.description
                                                                            }{" "}
                                                                            —
                                                                            Qty{" "}
                                                                            {
                                                                                item.quantity
                                                                            }{" "}
                                                                            x{" "}
                                                                            {formatPeso(
                                                                                item.unit_price,
                                                                            )}
                                                                        </p>
                                                                    ),
                                                                )
                                                            ) : (
                                                                <>
                                                                    {billing
                                                                        .service_catalog
                                                                        ?.name ??
                                                                        "—"}
                                                                    {billing.service_catalog && (
                                                                        <p className="text-xs text-gray-500">
                                                                            Qty{" "}
                                                                            {
                                                                                billing.service_quantity
                                                                            }{" "}
                                                                            x{" "}
                                                                            {formatPeso(
                                                                                billing.service_unit_price,
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {formatPeso(
                                                        billing.total_amount,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {formatPeso(
                                                        billing.amount_paid,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {balance.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 capitalize">
                                                    {billing.status}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link
                                                        href={route(
                                                            "billing.receipt",
                                                            billing.id,
                                                        )}
                                                        className="text-gray-700 hover:underline"
                                                        target="_blank"
                                                    >
                                                        Receipt
                                                    </Link>
                                                    {can_manage_billing && (
                                                        <>
                                                            {(billing.sale_type ??
                                                                "clinic_service") !==
                                                                "pet_shop_retail" &&
                                                                billing.status !==
                                                                    "paid" &&
                                                                billing.status !==
                                                                    "cancelled" && (
                                                                <button
                                                                    className="ms-3 text-indigo-600 hover:underline"
                                                                    onClick={() =>
                                                                        startEdit(
                                                                            billing,
                                                                        )
                                                                    }
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                            {billing.status !==
                                                                "paid" &&
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
                                                            {can_delete_billing && (
                                                                <button
                                                                    className="ms-3 text-red-600 hover:underline"
                                                                    onClick={() =>
                                                                        setDeleteTarget(
                                                                            billing,
                                                                        )
                                                                    }
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        <ListDisplayControls
                            totalCount={billingListCount}
                            showingCount={billingShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>
                </div>
            </div>

            {deleteTarget && (
                <DeleteInvoiceModal
                    billing={deleteTarget}
                    isPlatformAdmin={isPlatformAdmin}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}
