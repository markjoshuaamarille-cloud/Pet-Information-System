<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Billing;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Pet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Support\ClinicServices;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Billing/Index', [
            'billings' => Billing::with(['client', 'pet', 'appointment', 'payments'])->latest()->get(),
            'clients' => Client::orderBy('name')->get(['id', 'name']),
            'pets' => Pet::with('client')->orderBy('pet_name')->get(),
            'appointments' => Appointment::with(['pet:id,pet_name,client_id', 'client:id,name'])
                ->orderByDesc('scheduled_at')
                ->get()
                ->map(fn (Appointment $appointment) => [
                    'id' => $appointment->id,
                    'pet_id' => $appointment->pet_id,
                    'client_id' => $appointment->client_id,
                    'scheduled_at' => $appointment->scheduled_at,
                    'status' => $appointment->status,
                    'service_type' => $appointment->getAttribute('type'),
                    'service_label' => ClinicServices::label($appointment->getAttribute('type')),
                    'pet' => $appointment->pet,
                    'client' => $appointment->client,
                ])
                ->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'pet_id' => 'nullable|exists:pets,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'subtotal' => 'required|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $tax = (float) ($validated['tax'] ?? 0);
        $discount = (float) ($validated['discount'] ?? 0);
        $subtotal = (float) $validated['subtotal'];
        $total = max($subtotal + $tax - $discount, 0);

        Billing::create([
            ...$validated,
            'invoice_number' => $this->generateInvoiceNumber(),
            'tax' => $tax,
            'discount' => $discount,
            'total_amount' => $total,
            'amount_paid' => 0,
            'status' => 'unpaid',
        ]);

        return redirect()->back()->with('success', 'Invoice created successfully.');
    }

    public function update(Request $request, Billing $billing): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'pet_id' => 'nullable|exists:pets,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'subtotal' => 'required|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'status' => 'required|in:unpaid,partial,paid,cancelled',
        ]);

        $tax = (float) ($validated['tax'] ?? 0);
        $discount = (float) ($validated['discount'] ?? 0);
        $subtotal = (float) $validated['subtotal'];
        $total = max($subtotal + $tax - $discount, 0);

        $status = $this->statusFromAmounts((float) $billing->amount_paid, $total, $validated['status']);

        $billing->update([
            ...$validated,
            'tax' => $tax,
            'discount' => $discount,
            'total_amount' => $total,
            'status' => $status,
        ]);

        return redirect()->back()->with('success', 'Invoice updated successfully.');
    }

    public function destroy(Billing $billing): RedirectResponse
    {
        $billing->delete();

        return redirect()->back()->with('success', 'Invoice deleted.');
    }

    public function storePayment(Request $request, Billing $billing): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:cash,card,gcash,maya,bank_transfer',
            'paid_at' => 'required|date',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($billing, $validated): void {
            Payment::create([
                'billing_id' => $billing->id,
                ...$validated,
            ]);

            $newAmountPaid = (float) $billing->amount_paid + (float) $validated['amount'];
            $status = $this->statusFromAmounts($newAmountPaid, (float) $billing->total_amount, $billing->status);

            $billing->update([
                'amount_paid' => min($newAmountPaid, (float) $billing->total_amount),
                'status' => $status,
            ]);
        });

        return redirect()->back()->with('success', 'Payment posted successfully.');
    }

    public function receipt(Billing $billing): Response
    {
        $billing->load(['client', 'pet', 'appointment', 'payments' => fn ($query) => $query->orderBy('paid_at')]);

        $appointment = $billing->appointment;
        $serviceLabel = $appointment
            ? ClinicServices::label($appointment->getAttribute('type'))
            : null;

        return Inertia::render('Billing/Receipt', [
            'billing' => [
                ...$billing->toArray(),
                'client' => $billing->client,
                'pet' => $billing->pet,
                'appointment' => $appointment ? [
                    'id' => $appointment->id,
                    'scheduled_at' => $appointment->scheduled_at,
                    'service_type' => $appointment->getAttribute('type'),
                    'service_label' => $serviceLabel,
                ] : null,
                'payments' => $billing->payments,
            ],
        ]);
    }

    private function generateInvoiceNumber(): string
    {
        $prefix = 'INV-'.now()->format('Ymd');
        $count = Billing::whereDate('created_at', today())->count() + 1;

        return sprintf('%s-%04d', $prefix, $count);
    }

    private function statusFromAmounts(float $amountPaid, float $totalAmount, string $currentStatus): string
    {
        if ($currentStatus === 'cancelled') {
            return 'cancelled';
        }

        if ($amountPaid <= 0) {
            return 'unpaid';
        }

        if ($amountPaid < $totalAmount) {
            return 'partial';
        }

        return 'paid';
    }
}
