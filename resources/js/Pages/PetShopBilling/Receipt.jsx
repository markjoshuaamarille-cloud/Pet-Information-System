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

const orderEffectiveTotal = (order) =>
    Number(order.display_total_amount ?? order.total_amount ?? 0);

const orderEffectiveSubtotal = (order) =>
    Number(order.display_subtotal ?? order.subtotal ?? 0);

const orderEffectiveTax = (order) =>
    Number(order.display_tax ?? order.tax ?? 0);

const lineEffectiveTotal = (item) =>
    Number(item.display_line_total ?? item.line_total ?? 0);

const lineEffectiveUnitPrice = (item) =>
    Number(item.current_unit_price ?? item.unit_price ?? 0);

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

function ReceiptLogo() {
    return (
        <div className="mb-3 flex justify-center">
            <img
                src="/images/pawgo-logo.png"
                alt="Pawgo"
                className="h-10 w-auto grayscale"
            />
        </div>
    );
}

export default function PetShopReceipt({ order }) {
    const totalAmount = orderEffectiveTotal(order);
    const balance = totalAmount - Number(order.amount_paid);
    const clinic = order.clinic;

    return (
        <div className="min-h-screen bg-white p-4 print:p-2">
            <Head title={`Receipt - ${order.invoice_number}`} />
            <div className="mx-auto max-w-sm text-xs">
                <FlashMessage />

                <div className="mb-4 border-b border-gray-300 pb-3 text-center">
                    <ReceiptLogo />
                    <h1 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                        {clinic?.name ?? "Pet Shop"}
                    </h1>
                    <p className="mt-0.5 text-[10px] text-gray-500">Official Sales Receipt</p>
                    {clinic && (
                        <dl className="mt-2 space-y-0.5 text-[10px] text-gray-600">
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

                <section className="mb-4 space-y-2">
                    <div className="space-y-0.5">
                        <p><strong>Invoice no.:</strong> {order.invoice_number}</p>
                        <p>
                            <strong>Status:</strong>{" "}
                            <span className="capitalize">{order.status}</span>
                        </p>
                        <p>
                            <strong>Date issued:</strong>{" "}
                            {formatDateTime(order.created_at)}
                        </p>
                        {order.inventory_deducted && (
                            <p className="text-green-700">Inventory deducted for this sale</p>
                        )}
                    </div>
                    <div className="space-y-0.5 border-t border-dashed border-gray-300 pt-2">
                        <p><strong>Customer:</strong> {order.client?.name ?? "—"}</p>
                        <p><strong>Contact:</strong> {order.client?.contact ?? "—"}</p>
                        <p><strong>Email:</strong> {order.client?.email ?? "—"}</p>
                        <p><strong>Address:</strong> {clientAddress(order.client)}</p>
                    </div>
                </section>

                <section className="mb-4">
                    <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">Products</h2>
                    <table className="w-full border border-gray-300 text-[10px]">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-1 text-left">Item</th>
                                <th className="border border-gray-300 p-1 text-left">Cat.</th>
                                <th className="border border-gray-300 p-1 text-right">Qty</th>
                                <th className="border border-gray-300 p-1 text-right">Price</th>
                                <th className="border border-gray-300 p-1 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.line_items ?? []).length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="border border-gray-300 p-2 text-center text-gray-500"
                                    >
                                        No line items recorded.
                                    </td>
                                </tr>
                            ) : (
                                order.line_items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="border border-gray-300 p-1">
                                            {item.description}
                                            {item.has_price_adjustment && (
                                                <span className="mt-0.5 block text-[9px] text-amber-700">
                                                    {formatMoney(
                                                        item.quoted_unit_price,
                                                    )}{" "}
                                                    →{" "}
                                                    {formatMoney(
                                                        item.current_unit_price,
                                                    )}
                                                </span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 p-1 text-gray-600">
                                            {categoryLabels[
                                                item.medicine?.category
                                            ] ??
                                                item.medicine?.category ??
                                                "—"}
                                        </td>
                                        <td className="border border-gray-300 p-1 text-right">
                                            {item.quantity}
                                        </td>
                                        <td className="border border-gray-300 p-1 text-right">
                                            {formatMoney(
                                                lineEffectiveUnitPrice(item),
                                            )}
                                        </td>
                                        <td className="border border-gray-300 p-1 text-right font-medium">
                                            {formatMoney(
                                                lineEffectiveTotal(item),
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </section>

                <section className="mb-4">
                    <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">Summary</h2>
                    <table className="w-full border border-gray-300 text-[10px]">
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-1">Subtotal</td>
                                <td className="border border-gray-300 p-1 text-right">
                                    {formatMoney(orderEffectiveSubtotal(order))}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-1">
                                    Tax
                                    {order.tax_applied && order.tax_rate
                                        ? ` (${order.tax_rate}%)`
                                        : ""}
                                </td>
                                <td className="border border-gray-300 p-1 text-right">
                                    {formatMoney(orderEffectiveTax(order))}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-1">Discount</td>
                                <td className="border border-gray-300 p-1 text-right">
                                    -{formatMoney(order.discount)}
                                </td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                                <td className="border border-gray-300 p-1">Total</td>
                                <td className="border border-gray-300 p-1 text-right">
                                    {formatMoney(totalAmount)}
                                    {order.has_price_adjustments && (
                                        <span className="mt-0.5 block text-[9px] font-normal text-amber-700">
                                            Updated from{" "}
                                            {formatMoney(order.total_amount)}
                                        </span>
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-1">Amount paid</td>
                                <td className="border border-gray-300 p-1 text-right">
                                    {formatMoney(order.amount_paid)}
                                </td>
                            </tr>
                            <tr className="font-semibold">
                                <td className="border border-gray-300 p-1">Balance due</td>
                                <td className="border border-gray-300 p-1 text-right">
                                    {formatMoney(balance)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {order.notes && (
                    <section className="mb-4">
                        <h2 className="mb-1 font-semibold">Order notes</h2>
                        <p className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-2 text-[10px]">
                            {order.notes}
                        </p>
                    </section>
                )}

                <section className="mb-4">
                    <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
                        Payment history
                    </h2>
                    {(order.payments ?? []).length === 0 ? (
                        <p className="text-[10px] text-gray-500">
                            No payments recorded yet.
                        </p>
                    ) : (
                        <table className="w-full border border-gray-300 text-[10px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-1 text-left">Date</th>
                                    <th className="border border-gray-300 p-1 text-left">Method</th>
                                    <th className="border border-gray-300 p-1 text-left">Ref</th>
                                    <th className="border border-gray-300 p-1 text-right">Amt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="border border-gray-300 p-1">
                                            {formatClinicDateTime(
                                                payment.paid_at,
                                            ) ?? "—"}
                                        </td>
                                        <td className="border border-gray-300 p-1">
                                            {methodLabels[payment.method] ??
                                                payment.method}
                                        </td>
                                        <td className="border border-gray-300 p-1">
                                            {payment.reference_number || "—"}
                                        </td>
                                        <td className="border border-gray-300 p-1 text-right">
                                            {formatMoney(payment.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                <p className="mt-4 text-center text-[9px] text-gray-400">
                    Generated {new Date().toLocaleString()}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700"
                    >
                        Print receipt
                    </button>
                    <Link
                        href={route("pet-shop-billing.index")}
                        className="text-xs text-gray-600 hover:underline"
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
