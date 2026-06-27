import FlashMessage from "@/Components/FlashMessage";
import { Head, Link } from "@inertiajs/react";
import { formatClinicDateTime } from "@/utils/formatDateTime";

const formatMoney = (value) => `₱${Number(value ?? 0).toFixed(2)}`;

const methodLabels = {
    cash: "Cash",
    card: "Card",
    gcash: "GCash",
    maya: "Maya",
    bank_transfer: "Bank Transfer",
};

const clinicAddress = (clinic) =>
    clinic?.address_formatted ||
    [clinic?.address, clinic?.city, clinic?.province]
        .filter(Boolean)
        .join(", ") ||
    "—";

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

export default function SettlementReceipt({ settlement }) {
    return (
        <div className="min-h-screen bg-white p-4 print:p-2">
            <Head title={`Commission Receipt - ${settlement.receipt_number}`} />
            <div className="mx-auto max-w-md text-xs">
                <FlashMessage />

                <div className="mb-4 border-b border-gray-300 pb-3 text-center">
                    <ReceiptLogo />
                    <h1 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                        PAWGO Commission Receipt
                    </h1>
                    <p className="mt-1 text-[11px] text-gray-600">
                        Pawgo Pet Care Platform
                    </p>
                    <p className="mt-2 font-mono text-sm font-semibold">
                        {settlement.receipt_number}
                    </p>
                </div>

                <div className="mb-4 space-y-1 text-gray-700">
                    <p>
                        <span className="font-semibold">Business:</span>{" "}
                        {settlement.clinic?.name ?? "—"}
                    </p>
                    <p>
                        <span className="font-semibold">Address:</span>{" "}
                        {clinicAddress(settlement.clinic)}
                    </p>
                    <p>
                        <span className="font-semibold">Period:</span>{" "}
                        {settlement.period_start ?? "—"} to{" "}
                        {settlement.period_end ?? "—"}
                    </p>
                    <p>
                        <span className="font-semibold">Paid at:</span>{" "}
                        {formatClinicDateTime(settlement.paid_at)}
                    </p>
                    <p>
                        <span className="font-semibold">Payment method:</span>{" "}
                        {methodLabels[settlement.payment_method] ??
                            settlement.payment_method}
                    </p>
                    {settlement.reference_number && (
                        <p>
                            <span className="font-semibold">Reference:</span>{" "}
                            {settlement.reference_number}
                        </p>
                    )}
                    {settlement.recorded_by && (
                        <p>
                            <span className="font-semibold">Recorded by:</span>{" "}
                            {settlement.recorded_by}
                        </p>
                    )}
                </div>

                <div className="mb-4 rounded border border-gray-200">
                    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 font-semibold">
                        Summary
                    </div>
                    <div className="space-y-1 px-3 py-2">
                        <div className="flex justify-between">
                            <span>Transactions covered</span>
                            <span>{settlement.transaction_count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total transaction amount</span>
                            <span>{formatMoney(settlement.total_gross)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Platform commission</span>
                            <span>
                                {formatMoney(settlement.total_commission)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Business net earnings</span>
                            <span>
                                {formatMoney(
                                    settlement.total_business_earnings,
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                            <span>Amount received by platform</span>
                            <span>
                                {formatMoney(settlement.amount_received)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-4 overflow-hidden rounded border border-gray-200">
                    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 font-semibold">
                        Transaction details
                    </div>
                    <table className="w-full text-[10px]">
                        <thead>
                            <tr className="border-b border-gray-200 text-left">
                                <th className="px-2 py-1">Invoice</th>
                                <th className="px-2 py-1">Service</th>
                                <th className="px-2 py-1 text-right">Amount</th>
                                <th className="px-2 py-1 text-right">Comm.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {settlement.commissions.map((row, index) => (
                                <tr
                                    key={`${row.invoice_number}-${index}`}
                                    className="border-b border-gray-100"
                                >
                                    <td className="px-2 py-1">
                                        {row.invoice_number ?? "—"}
                                    </td>
                                    <td className="px-2 py-1">
                                        {row.business_line_label}
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                        {formatMoney(row.transaction_amount)}
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                        {formatMoney(row.commission_amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {settlement.notes && (
                    <div className="mb-4 rounded border border-gray-200 px-3 py-2">
                        <p className="font-semibold">Notes</p>
                        <p className="mt-1 whitespace-pre-wrap text-gray-700">
                            {settlement.notes}
                        </p>
                    </div>
                )}

                <p className="mb-4 text-center text-[10px] text-gray-500">
                    This receipt confirms commission payment received by the
                    platform owner from the partnered business listed above.
                </p>

                <div className="flex justify-center gap-3 print:hidden">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        Print receipt
                    </button>
                    <Link
                        href={route("admin.platform-commissions.index")}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Back to commissions
                    </Link>
                </div>
            </div>
        </div>
    );
}
