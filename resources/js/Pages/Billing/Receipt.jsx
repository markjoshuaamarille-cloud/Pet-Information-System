import { Head, Link } from '@inertiajs/react';
import FlashMessage from '@/Components/FlashMessage';

const formatDate = (value) => {
    if (!value) {
        return '—';
    }

    const iso = String(value);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleDateString();
};

const formatDateTime = (value) => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const formatMoney = (value) => Number(value ?? 0).toFixed(2);

const methodLabels = {
    cash: 'Cash',
    card: 'Card',
    gcash: 'GCash',
    maya: 'Maya',
    bank_transfer: 'Bank Transfer',
};

export default function BillingReceipt({ billing }) {
    const balance = Number(billing.total_amount) - Number(billing.amount_paid);

    return (
        <div className="min-h-screen bg-white p-8 print:p-4">
            <Head title={`Receipt - ${billing.invoice_number}`} />
            <div className="mx-auto max-w-3xl">
                <FlashMessage />
                <div className="mb-6 border-b pb-4 text-center">
                    <h1 className="text-2xl font-bold">Pet Care Management System</h1>
                    <p className="text-gray-600">Official Receipt / Invoice</p>
                </div>

                <section className="mb-6 grid gap-4 sm:grid-cols-2 text-sm">
                    <div>
                        <p><strong>Invoice No:</strong> {billing.invoice_number}</p>
                        <p><strong>Type:</strong> {(billing.sale_type ?? 'clinic_service') === 'pet_shop_retail' ? 'Pet Shop Sale' : 'Clinic Service'}</p>
                        <p><strong>Status:</strong> <span className="capitalize">{billing.status}</span></p>
                        <p><strong>Issue Date:</strong> {formatDate(billing.created_at)}</p>
                        {billing.due_date && (
                            <p><strong>Due Date:</strong> {formatDate(billing.due_date)}</p>
                        )}
                    </div>
                    <div>
                        <p><strong>Client:</strong> {billing.client?.name ?? '—'}</p>
                        <p><strong>Contact:</strong> {billing.client?.contact ?? '—'}</p>
                        {billing.pet && (
                            <p><strong>Pet:</strong> {billing.pet.pet_name} ({billing.pet.species})</p>
                        )}
                        {billing.appointment && (
                            <p>
                                <strong>Appointment:</strong>{' '}
                                {formatDate(billing.appointment.scheduled_at)} — {billing.appointment.service_label}
                            </p>
                        )}
                        {billing.service_catalog && (
                            <p>
                                <strong>Service:</strong> {billing.service_catalog.name}
                                {' '}({billing.service_quantity} x {formatMoney(billing.service_unit_price)})
                            </p>
                        )}
                    </div>
                </section>

                {(billing.line_items?.length > 0) && (
                    <section className="mb-6">
                        <h2 className="mb-3 text-lg font-semibold">
                            {(billing.sale_type ?? 'clinic_service') === 'pet_shop_retail'
                                ? 'Products'
                                : 'Services & Charges'}
                        </h2>
                        <table className="w-full border text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-2 text-left">Item</th>
                                    <th className="border p-2 text-right">Qty</th>
                                    <th className="border p-2 text-right">Unit Price</th>
                                    <th className="border p-2 text-right">Line Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billing.line_items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="border p-2">{item.description}</td>
                                        <td className="border p-2 text-right">{item.quantity}</td>
                                        <td className="border p-2 text-right">{formatMoney(item.unit_price)}</td>
                                        <td className="border p-2 text-right">{formatMoney(item.line_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                <section className="mb-6">
                    <table className="w-full border text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 text-left">Description</th>
                                <th className="border p-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border p-2">Subtotal</td>
                                <td className="border p-2 text-right">{formatMoney(billing.subtotal)}</td>
                            </tr>
                            <tr>
                                <td className="border p-2">Tax</td>
                                <td className="border p-2 text-right">{formatMoney(billing.tax)}</td>
                            </tr>
                            <tr>
                                <td className="border p-2">Discount</td>
                                <td className="border p-2 text-right">-{formatMoney(billing.discount)}</td>
                            </tr>
                            <tr className="font-semibold">
                                <td className="border p-2">Total</td>
                                <td className="border p-2 text-right">{formatMoney(billing.total_amount)}</td>
                            </tr>
                            <tr>
                                <td className="border p-2">Amount Paid</td>
                                <td className="border p-2 text-right">{formatMoney(billing.amount_paid)}</td>
                            </tr>
                            <tr className="font-semibold">
                                <td className="border p-2">Balance</td>
                                <td className="border p-2 text-right">{formatMoney(balance)}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {billing.notes && (
                    <section className="mb-6 text-sm">
                        <h2 className="mb-2 font-semibold">Notes</h2>
                        <p className="whitespace-pre-wrap">{billing.notes}</p>
                    </section>
                )}

                <section className="mb-6">
                    <h2 className="mb-3 text-lg font-semibold">Payment History</h2>
                    {billing.payments?.length === 0 ? (
                        <p className="text-sm text-gray-500">No payments recorded yet.</p>
                    ) : (
                        <table className="w-full border text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-2 text-left">Date</th>
                                    <th className="border p-2 text-left">Method</th>
                                    <th className="border p-2 text-left">Reference</th>
                                    <th className="border p-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billing.payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="border p-2">{formatDateTime(payment.paid_at)}</td>
                                        <td className="border p-2 capitalize">
                                            {methodLabels[payment.method] ?? payment.method}
                                        </td>
                                        <td className="border p-2">{payment.reference_number || '—'}</td>
                                        <td className="border p-2 text-right">{formatMoney(payment.amount)}</td>
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
                        className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                    >
                        Print Receipt
                    </button>
                    <Link
                        href={route('billing.index')}
                        className="text-sm text-gray-600 hover:underline"
                    >
                        ← Back to Billing
                    </Link>
                </div>
            </div>
        </div>
    );
}
