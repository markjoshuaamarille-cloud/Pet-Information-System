import { Head, Link } from '@inertiajs/react';
import FlashMessage from '@/Components/FlashMessage';
import { formatClinicDateTime } from '@/utils/formatDateTime';

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

const formatMoney = (value) => `₱${Number(value ?? 0).toFixed(2)}`;

const methodLabels = {
    cash: 'Cash',
    card: 'Card',
    gcash: 'GCash',
    maya: 'Maya',
    bank_transfer: 'Bank Transfer',
};

const clinicAddress = (clinic) =>
    clinic?.address_formatted ||
    [clinic?.address, clinic?.city, clinic?.province].filter(Boolean).join(', ') ||
    '—';

const clientAddress = (client) =>
    client?.address_formatted || client?.address || '—';

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

function formatDateTime(value) {
    if (!value) {
        return '—';
    }

    const formatted = formatClinicDateTime(value);
    return formatted === '—' ? formatDate(value) : formatted;
}

export default function BillingReceipt({ billing }) {
    const balance = Number(billing.total_amount) - Number(billing.amount_paid);
    const clinic = billing.clinic;
    const saleType = billing.sale_type ?? 'clinic_service';
    const isPetShopSale = saleType === 'pet_shop_retail';

    return (
        <div className="min-h-screen bg-white p-4 print:p-2">
            <Head title={`Receipt - ${billing.invoice_number}`} />
            <div className="mx-auto max-w-sm text-xs">
                <FlashMessage />

                <div className="mb-4 border-b border-gray-300 pb-3 text-center">
                    <ReceiptLogo />
                    <h1 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                        {clinic?.name ?? 'Clinic'}
                    </h1>
                    <p className="mt-0.5 text-[10px] text-gray-500">
                        {isPetShopSale ? 'Official Sales Receipt' : 'Official Service Receipt'}
                    </p>
                    {clinic && (
                        <dl className="mt-2 space-y-0.5 text-[10px] text-gray-600">
                            <div>
                                <dt className="sr-only">Contact</dt>
                                <dd>{clinic.contact ?? '—'}</dd>
                            </div>
                            <div>
                                <dt className="sr-only">Email</dt>
                                <dd>{clinic.email ?? '—'}</dd>
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
                        <p><strong>Invoice no.:</strong> {billing.invoice_number}</p>
                        <p>
                            <strong>Type:</strong>{' '}
                            {isPetShopSale ? 'Pet Shop Sale' : 'Clinic Service'}
                        </p>
                        <p>
                            <strong>Status:</strong>{' '}
                            <span className="capitalize">{billing.status}</span>
                        </p>
                        <p>
                            <strong>Date issued:</strong>{' '}
                            {formatDateTime(billing.created_at)}
                        </p>
                        {billing.due_date && (
                            <p><strong>Due date:</strong> {formatDate(billing.due_date)}</p>
                        )}
                        {billing.appointment && (
                            <>
                                <p>
                                    <strong>Appointment:</strong>{' '}
                                    {formatDateTime(billing.appointment.scheduled_at)}
                                </p>
                                <p>
                                    <strong>Service:</strong>{' '}
                                    {billing.appointment.service_label ?? '—'}
                                </p>
                            </>
                        )}
                        {billing.pet && (
                            <p>
                                <strong>Pet:</strong> {billing.pet.pet_name}
                                {billing.pet.species ? ` (${billing.pet.species})` : ''}
                            </p>
                        )}
                        {billing.service_catalog && (
                            <p>
                                <strong>Catalog service:</strong> {billing.service_catalog.name}
                                {' '}({billing.service_quantity} x {formatMoney(billing.service_unit_price)})
                            </p>
                        )}
                    </div>
                    <div className="space-y-0.5 border-t border-dashed border-gray-300 pt-2">
                        <p><strong>Customer:</strong> {billing.client?.name ?? '—'}</p>
                        <p><strong>Contact:</strong> {billing.client?.contact ?? '—'}</p>
                        <p><strong>Email:</strong> {billing.client?.email ?? '—'}</p>
                        <p><strong>Address:</strong> {clientAddress(billing.client)}</p>
                    </div>
                </section>

                {(billing.line_items?.length > 0) && (
                    <section className="mb-4">
                        <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
                            {isPetShopSale ? 'Products' : 'Services & Charges'}
                        </h2>
                        <table className="w-full border border-gray-300 text-[10px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-1 text-left">Item</th>
                                    <th className="border border-gray-300 p-1 text-right">Qty</th>
                                    <th className="border border-gray-300 p-1 text-right">Price</th>
                                    <th className="border border-gray-300 p-1 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billing.line_items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="border border-gray-300 p-1">{item.description}</td>
                                        <td className="border border-gray-300 p-1 text-right">{item.quantity}</td>
                                        <td className="border border-gray-300 p-1 text-right">{formatMoney(item.unit_price)}</td>
                                        <td className="border border-gray-300 p-1 text-right font-medium">{formatMoney(item.line_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                <section className="mb-4">
                    <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">Summary</h2>
                    <table className="w-full border border-gray-300 text-[10px]">
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-1">Subtotal</td>
                                <td className="border border-gray-300 p-1 text-right">{formatMoney(billing.subtotal)}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-1">
                                    Tax
                                    {billing.tax_applied && billing.tax_rate
                                        ? ` (${billing.tax_rate}%)`
                                        : ''}
                                </td>
                                <td className="border border-gray-300 p-1 text-right">{formatMoney(billing.tax)}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-1">Discount</td>
                                <td className="border border-gray-300 p-1 text-right">-{formatMoney(billing.discount)}</td>
                            </tr>
                            <tr className="bg-gray-50 font-semibold">
                                <td className="border border-gray-300 p-1">Total</td>
                                <td className="border border-gray-300 p-1 text-right">{formatMoney(billing.total_amount)}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-1">Amount paid</td>
                                <td className="border border-gray-300 p-1 text-right">{formatMoney(billing.amount_paid)}</td>
                            </tr>
                            <tr className="font-semibold">
                                <td className="border border-gray-300 p-1">Balance due</td>
                                <td className="border border-gray-300 p-1 text-right">{formatMoney(balance)}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {billing.notes && (
                    <section className="mb-4">
                        <h2 className="mb-1 font-semibold">Notes</h2>
                        <p className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-2 text-[10px]">
                            {billing.notes}
                        </p>
                    </section>
                )}

                <section className="mb-4">
                    <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
                        Payment history
                    </h2>
                    {billing.payments?.length === 0 ? (
                        <p className="text-[10px] text-gray-500">No payments recorded yet.</p>
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
                                {billing.payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="border border-gray-300 p-1">
                                            {formatClinicDateTime(payment.paid_at) ?? '—'}
                                        </td>
                                        <td className="border border-gray-300 p-1">
                                            {methodLabels[payment.method] ?? payment.method}
                                        </td>
                                        <td className="border border-gray-300 p-1">{payment.reference_number || '—'}</td>
                                        <td className="border border-gray-300 p-1 text-right">{formatMoney(payment.amount)}</td>
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
                        className="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700"
                    >
                        Print receipt
                    </button>
                    <Link
                        href={route('billing.index')}
                        className="text-xs text-gray-600 hover:underline"
                    >
                        ← Back to Billing
                    </Link>
                </div>
            </div>
        </div>
    );
}
