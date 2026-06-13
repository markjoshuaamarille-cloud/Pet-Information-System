import { Head, Link } from "@inertiajs/react";
import FlashMessage from "@/Components/FlashMessage";
import { formatClinicDateTime } from "@/utils/formatDateTime";

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

const formatMoney = (value) => `₱${Number(value ?? 0).toFixed(2)}`;

const methodLabels = {
    cash: "Cash",
    card: "Card",
    gcash: "GCash",
    maya: "Maya",
    bank_transfer: "Bank Transfer",
};

const categoryLabels = {
    medicine: "Medicine",
    supplement_vitamin: "Supplement / Vitamin",
    consumable_supply: "Consumable / Supply",
    parasite_control: "Parasite Control",
    grooming_hygiene: "Grooming / Hygiene",
    pet_food: "Pet Food",
};

const clinicAddress = (clinic) =>
    clinic?.address_formatted ||
    [clinic?.address, clinic?.city, clinic?.province].filter(Boolean).join(", ") ||
    "—";

const clientAddress = (client) =>
    client?.address_formatted || client?.address || "—";

export default function PetShopReceipt({ order }) {
    const balance = Number(order.total_amount) - Number(order.amount_paid);
    const clinic = order.clinic;

    return (
        <div className="min-h-screen bg-white p-8 print:p-4">
            <Head title={`Receipt - ${order.invoice_number}`} />
            <div className="mx-auto max-w-3xl">
                <FlashMessage />

                <div className="mb-6 border-b pb-4">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {clinic?.name ?? "Pet Shop"}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Official Sales Receipt
                        </p>
                    </div>
                    {clinic && (
                        <dl className="mt-4 grid gap-1 text-center text-sm text-gray-600 sm:grid-cols-3">
                            <div>
                                <dt className="sr-only">Contact</dt>
                                <dd>{clinic.contact ?? "—"}</dd>
                            </div>
                            <div>
                                <dt className="sr-only">Email</dt>
                                <dd>{clinic.email ?? "—"}</dd>
                            </div>
                            <div>
                                <dt className="sr-only">Address</dt>
                                <dd>{clinicAddress(clinic)}</dd>
                            </div>
                        </dl>
                    )}
                </div>

                <section className="mb-6 grid gap-4 sm:grid-cols-2 text-sm">
                    <div className="rounded-lg border border-gray-200 p-4">
                        <h2 className="mb-2 font-semibold text-gray-800">
                            Invoice details
                        </h2>
                        <p>
                            <strong>Invoice no.:</strong> {order.invoice_number}
                        </p>
                        <p>
                            <strong>Status:</strong>{" "}
                            <span className="capitalize">{order.status}</span>
                        </p>
                        <p>
                            <strong>Date issued:</strong>{" "}
                            {formatDateTime(order.created_at)}
                        </p>
                        {order.inventory_deducted && (
                            <p className="mt-1 text-green-700">
                                Inventory deducted for this sale
                            </p>
                        )}
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                        <h2 className="mb-2 font-semibold text-gray-800">
                            Customer
                        </h2>
                        <p>
                            <strong>Name:</strong> {order.client?.name ?? "—"}
                        </p>
                        <p>
                            <strong>Contact:</strong>{" "}
                            {order.client?.contact ?? "—"}
                        </p>
                        <p>
                            <strong>Email:</strong>{" "}
                            {order.client?.email ?? "—"}
                        </p>
                        <p>
                            <strong>Address:</strong>{" "}
                            {clientAddress(order.client)}
                        </p>
                    </div>
                </section>

                <section className="mb-6">
                    <h2 className="mb-3 text-lg font-semibold">Products</h2>
                    <table className="w-full border text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 text-left">Item</th>
                                <th className="border p-2 text-left">Category</th>
                                <th className="border p-2 text-right">Qty</th>
                                <th className="border p-2 text-right">
                                    Unit price
                                </th>
                                <th className="border p-2 text-right">
                                    Line total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.line_items ?? []).length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="border p-4 text-center text-gray-500"
                                    >
                                        No line items recorded.
                                    </td>
                                </tr>
                            ) : (
                                order.line_items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="border p-2">
                                            {item.description}
                                        </td>
                                        <td className="border p-2 text-gray-600">
                                            {categoryLabels[
                                                item.medicine?.category
                                            ] ??
                                                item.medicine?.category ??
                                                "—"}
                                        </td>
                                        <td className="border p-2 text-right">
                                            {item.quantity}
                                        </td>
                                        <td className="border p-2 text-right">
                                            {formatMoney(item.unit_price)}
                                        </td>
                                        <td className="border p-2 text-right font-medium">
                                            {formatMoney(item.line_total)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </section>

                <section className="mb-6">
                    <h2 className="mb-3 text-lg font-semibold">Summary</h2>
                    <table className="w-full border text-sm">
                        <tbody>
                            <tr>
                                <td className="border p-2">Subtotal</td>
                                <td className="border p-2 text-right">
                                    {formatMoney(order.subtotal)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-2">
                                    Tax
                                    {order.tax_applied && order.tax_rate
                                        ? ` (${order.tax_rate}%)`
                                        : ""}
                                </td>
                                <td className="border p-2 text-right">
                                    {formatMoney(order.tax)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-2">Discount</td>
                                <td className="border p-2 text-right">
                                    -{formatMoney(order.discount)}
                                </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                                <td className="border p-2">Total</td>
                                <td className="border p-2 text-right">
                                    {formatMoney(order.total_amount)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border p-2">Amount paid</td>
                                <td className="border p-2 text-right">
                                    {formatMoney(order.amount_paid)}
                                </td>
                            </tr>
                            <tr className="font-semibold">
                                <td className="border p-2">Balance due</td>
                                <td className="border p-2 text-right">
                                    {formatMoney(balance)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {order.notes && (
                    <section className="mb-6 text-sm">
                        <h2 className="mb-2 font-semibold">Order notes</h2>
                        <p className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3">
                            {order.notes}
                        </p>
                    </section>
                )}

                <section className="mb-6">
                    <h2 className="mb-3 text-lg font-semibold">
                        Payment history
                    </h2>
                    {(order.payments ?? []).length === 0 ? (
                        <p className="text-sm text-gray-500">
                            No payments recorded yet.
                        </p>
                    ) : (
                        <table className="w-full border text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-2 text-left">
                                        Date & time
                                    </th>
                                    <th className="border p-2 text-left">
                                        Method
                                    </th>
                                    <th className="border p-2 text-left">
                                        Reference
                                    </th>
                                    <th className="border p-2 text-left">
                                        Notes
                                    </th>
                                    <th className="border p-2 text-right">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="border p-2">
                                            {formatClinicDateTime(
                                                payment.paid_at,
                                            ) ?? "—"}
                                        </td>
                                        <td className="border p-2">
                                            {methodLabels[payment.method] ??
                                                payment.method}
                                        </td>
                                        <td className="border p-2">
                                            {payment.reference_number || "—"}
                                        </td>
                                        <td className="border p-2">
                                            {payment.notes || "—"}
                                        </td>
                                        <td className="border p-2 text-right">
                                            {formatMoney(payment.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                <p className="mt-8 text-center text-xs text-gray-400">
                    Generated {new Date().toLocaleString()}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                    >
                        Print receipt
                    </button>
                    <Link
                        href={route("pet-shop-billing.index")}
                        className="text-sm text-gray-600 hover:underline"
                    >
                        ← Back to Pet Shop Billing
                    </Link>
                </div>
            </div>
        </div>
    );
}

function formatDateTime(value) {
    if (!value) {
        return "—";
    }

    const formatted = formatClinicDateTime(value);
    return formatted === "—" ? formatDate(value) : formatted;
}
