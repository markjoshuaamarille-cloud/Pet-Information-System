import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Checkbox from "@/Components/Checkbox";
import FlashMessage from "@/Components/FlashMessage";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import ListDisplayControls from "@/Components/ListDisplayControls";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import useListDisplayLimit from "@/hooks/useListDisplayLimit";
import { Head, router, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

const paymentMethods = ["cash", "card", "gcash", "maya", "bank_transfer"];

function formatPeso(value) {
    return `₱${Number(value ?? 0).toFixed(2)}`;
}

function formatDateTime(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString();
}

const statusStyles = {
    unpaid: "bg-amber-100 text-amber-800",
    partial: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
};

export default function PetShopBillingIndex({
    orders,
    stats = null,
    can_manage = false,
}) {
    const [statusFilter, setStatusFilter] = useState("all");
    const [editingOrder, setEditingOrder] = useState(null);
    const [payingOrder, setPayingOrder] = useState(null);

    const editForm = useForm({
        tax_applied: false,
        tax_rate: "12",
        discount: "0",
        notes: "",
    });

    const paymentForm = useForm({
        amount: "0",
        method: "cash",
        paid_at: new Date().toISOString().slice(0, 16),
        reference_number: "",
        notes: "",
    });

    const filteredOrders = useMemo(() => {
        if (statusFilter === "all") {
            return orders;
        }

        return orders.filter((order) => order.status === statusFilter);
    }, [orders, statusFilter]);

    const {
        visibleItems: visibleOrders,
        displayLimit,
        setDisplayLimit,
        totalCount: orderListCount,
        showingCount: orderShowingCount,
    } = useListDisplayLimit(filteredOrders);

    const editPreview = useMemo(() => {
        if (!editingOrder) {
            return { subtotal: 0, tax: 0, total: 0 };
        }

        const subtotal = Number(editingOrder.subtotal ?? 0);
        const discount = Number(editForm.data.discount || 0);
        const taxRate = Number(editForm.data.tax_rate || 0);
        const tax = editForm.data.tax_applied
            ? roundMoney(subtotal * (taxRate / 100))
            : 0;

        return {
            subtotal,
            tax,
            total: Math.max(roundMoney(subtotal + tax - discount), 0),
        };
    }, [
        editingOrder,
        editForm.data.tax_applied,
        editForm.data.tax_rate,
        editForm.data.discount,
    ]);

    const openEdit = (order) => {
        setEditingOrder(order);
        editForm.setData({
            tax_applied: Boolean(order.tax_applied),
            tax_rate: String(order.tax_rate ?? 12),
            discount: String(order.discount ?? 0),
            notes: order.notes ?? "",
        });
        editForm.clearErrors();
    };

    const closeEdit = () => {
        setEditingOrder(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const submitEdit = (e) => {
        e.preventDefault();

        if (!editingOrder) {
            return;
        }

        editForm.put(route("pet-shop-billing.update", editingOrder.id), {
            preserveScroll: true,
            onSuccess: () => closeEdit(),
        });
    };

    const openPayment = (order) => {
        const balance = Number(order.total_amount) - Number(order.amount_paid);
        setPayingOrder(order);
        paymentForm.setData({
            amount: balance > 0 ? balance.toFixed(2) : "0",
            method: "cash",
            paid_at: new Date().toISOString().slice(0, 16),
            reference_number: "",
            notes: "",
        });
        paymentForm.clearErrors();
    };

    const closePayment = () => {
        setPayingOrder(null);
        paymentForm.reset();
        paymentForm.clearErrors();
    };

    const submitPayment = (e) => {
        e.preventDefault();

        if (!payingOrder) {
            return;
        }

        paymentForm.post(
            route("pet-shop-billing.payments.store", payingOrder.id),
            {
                preserveScroll: true,
                onSuccess: () => closePayment(),
            },
        );
    };

    const deleteOrder = (order) => {
        if (!confirm(`Cancel order ${order.invoice_number}?`)) {
            return;
        }

        router.delete(route("pet-shop-billing.destroy", order.id), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Pet Shop Billing
                </h2>
            }
        >
            <Head title="Pet Shop Billing" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <div className="mb-6 rounded-lg border border-purple-100 bg-purple-50 p-4 text-sm text-purple-900">
                        <p>
                            Manage pet shop orders, apply tax and discount,
                            record payments, and monitor sales. Inventory is
                            updated when payment is completed.
                        </p>
                    </div>

                    {stats && (
                        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-lg bg-white p-4 shadow">
                                <p className="text-xs text-gray-500">
                                    Total orders
                                </p>
                                <p className="text-2xl font-semibold">
                                    {stats.total_orders}
                                </p>
                            </div>
                            <div className="rounded-lg bg-white p-4 shadow">
                                <p className="text-xs text-gray-500">
                                    Pending payment
                                </p>
                                <p className="text-2xl font-semibold text-amber-600">
                                    {stats.pending_orders}
                                </p>
                            </div>
                            <div className="rounded-lg bg-white p-4 shadow">
                                <p className="text-xs text-gray-500">
                                    Paid orders
                                </p>
                                <p className="text-2xl font-semibold text-green-600">
                                    {stats.paid_orders}
                                </p>
                            </div>
                            {/* <div className="rounded-lg bg-white p-4 shadow">
                                <p className="text-xs text-gray-500">Total sales</p>
                                <p className="text-2xl font-semibold">{formatPeso(stats.total_sales)}</p>
                            </div> */}
                            <div className="rounded-lg bg-white p-4 shadow">
                                <p className="text-xs text-gray-500">
                                    Collected today
                                </p>
                                <p className="text-2xl font-semibold">
                                    {formatPeso(stats.collected_today)}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mb-4 flex flex-wrap gap-2">
                        {[
                            { value: "all", label: "All" },
                            { value: "unpaid", label: "Unpaid" },
                            { value: "partial", label: "Partial" },
                            { value: "paid", label: "Paid" },
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setStatusFilter(option.value)}
                                className={`rounded-full px-3 py-1 text-sm font-medium ${
                                    statusFilter === option.value
                                        ? "bg-purple-600 text-white"
                                        : "bg-white text-gray-700 shadow ring-1 ring-gray-200"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

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
                                        Items
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Total
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Paid
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
                                {visibleOrders.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-8 text-center text-gray-500"
                                        >
                                            No pet shop orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    visibleOrders.map((order) => {
                                        const balance =
                                            Number(order.total_amount) -
                                            Number(order.amount_paid);

                                        return (
                                            <tr key={order.id}>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">
                                                        {order.invoice_number}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDateTime(
                                                            order.created_at,
                                                        )}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {order.client?.name ?? "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1">
                                                        {(
                                                            order.line_items ??
                                                            []
                                                        ).map((item) => (
                                                            <p
                                                                key={item.id}
                                                                className="text-xs text-gray-600"
                                                            >
                                                                {
                                                                    item.description
                                                                }{" "}
                                                                ×{" "}
                                                                {item.quantity}{" "}
                                                                (
                                                                {formatPeso(
                                                                    item.line_total,
                                                                )}
                                                                )
                                                            </p>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">
                                                        {formatPeso(
                                                            order.total_amount,
                                                        )}
                                                    </p>
                                                    {order.tax_applied && (
                                                        <p className="text-xs text-gray-500">
                                                            incl. tax{" "}
                                                            {order.tax_rate}%
                                                        </p>
                                                    )}
                                                    {Number(order.discount) >
                                                        0 && (
                                                        <p className="text-xs text-gray-500">
                                                            discount{" "}
                                                            {formatPeso(
                                                                order.discount,
                                                            )}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {formatPeso(
                                                        order.amount_paid,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[order.status] ?? statusStyles.unpaid}`}
                                                    >
                                                        {order.status}
                                                    </span>
                                                    {order.inventory_deducted && (
                                                        <p className="mt-1 text-xs text-green-600">
                                                            Inventory updated
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {can_manage &&
                                                        order.status !==
                                                            "paid" &&
                                                        order.status !==
                                                            "cancelled" && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="text-indigo-600 hover:underline"
                                                                    onClick={() =>
                                                                        openEdit(
                                                                            order,
                                                                        )
                                                                    }
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="ms-3 text-emerald-600 hover:underline"
                                                                    onClick={() =>
                                                                        openPayment(
                                                                            order,
                                                                        )
                                                                    }
                                                                >
                                                                    Pay
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="ms-3 text-red-600 hover:underline"
                                                                    onClick={() =>
                                                                        deleteOrder(
                                                                            order,
                                                                        )
                                                                    }
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        )}
                                                    {balance > 0 &&
                                                        !can_manage && (
                                                            <span className="text-xs text-amber-700">
                                                                Balance{" "}
                                                                {formatPeso(
                                                                    balance,
                                                                )}
                                                            </span>
                                                        )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        <ListDisplayControls
                            totalCount={orderListCount}
                            showingCount={orderShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>
                </div>
            </div>

            {editingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                Edit order {editingOrder.invoice_number}
                            </h3>
                            <button
                                type="button"
                                onClick={closeEdit}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                Close
                            </button>
                        </div>

                        <form onSubmit={submitEdit} className="space-y-4">
                            <div className="rounded bg-gray-50 p-3 text-sm">
                                <p>
                                    Subtotal:{" "}
                                    {formatPeso(editingOrder.subtotal)}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={editForm.data.tax_applied}
                                        onChange={(e) =>
                                            editForm.setData(
                                                "tax_applied",
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    Apply tax
                                </label>
                                <div className="w-24">
                                    <TextInput
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={editForm.data.tax_rate}
                                        disabled={!editForm.data.tax_applied}
                                        onChange={(e) =>
                                            editForm.setData(
                                                "tax_rate",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <span className="text-sm text-gray-500">%</span>
                            </div>

                            <div>
                                <InputLabel value="Discount" />
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="mt-1 block w-full"
                                    value={editForm.data.discount}
                                    onChange={(e) =>
                                        editForm.setData(
                                            "discount",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <InputLabel value="Notes" />
                                <textarea
                                    rows={2}
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                    value={editForm.data.notes}
                                    onChange={(e) =>
                                        editForm.setData(
                                            "notes",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="rounded border border-purple-100 bg-purple-50 p-3 text-sm">
                                <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span>{formatPeso(editPreview.tax)}</span>
                                </div>
                                <div className="mt-1 flex justify-between font-semibold">
                                    <span>New total</span>
                                    <span>{formatPeso(editPreview.total)}</span>
                                </div>
                            </div>

                            <InputError
                                message={editForm.errors.order}
                                className="mt-1"
                            />

                            <div className="flex justify-end gap-3">
                                <SecondaryButton
                                    type="button"
                                    onClick={closeEdit}
                                >
                                    Cancel
                                </SecondaryButton>
                                <PrimaryButton
                                    type="submit"
                                    disabled={editForm.processing}
                                >
                                    Save changes
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {payingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                Record payment
                            </h3>
                            <button
                                type="button"
                                onClick={closePayment}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                Close
                            </button>
                        </div>

                        <p className="mb-4 text-sm text-gray-600">
                            Order {payingOrder.invoice_number} — Total{" "}
                            {formatPeso(payingOrder.total_amount)}
                        </p>

                        <form onSubmit={submitPayment} className="space-y-4">
                            <div>
                                <InputLabel value="Amount" />
                                <TextInput
                                    type="number"
                                    min="0.01"
                                    step="0.01"
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
                                <InputError
                                    message={paymentForm.errors.amount}
                                    className="mt-1"
                                />
                                <InputError
                                    message={paymentForm.errors.payment}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <InputLabel value="Method" />
                                <select
                                    value={paymentForm.data.method}
                                    onChange={(e) =>
                                        paymentForm.setData(
                                            "method",
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                                >
                                    {paymentMethods.map((method) => (
                                        <option key={method} value={method}>
                                            {method.replace("_", " ")}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <InputLabel value="Paid at" />
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
                                <InputLabel value="Reference no." />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={paymentForm.data.reference_number}
                                    onChange={(e) =>
                                        paymentForm.setData(
                                            "reference_number",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <PrimaryButton
                                type="submit"
                                className="w-full justify-center"
                                disabled={paymentForm.processing}
                            >
                                {paymentForm.processing
                                    ? "Saving..."
                                    : "Complete payment"}
                            </PrimaryButton>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}

function roundMoney(value) {
    return Math.round(Number(value) * 100) / 100;
}
