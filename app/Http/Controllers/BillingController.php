<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Billing;
use App\Models\Client;
use App\Models\HealthRecord;
use App\Models\Payment;
use App\Models\Pet;
use App\Models\ServiceCatalog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Support\ClinicServices;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(): Response
    {
        $user = $this->currentUser();
        $isCustomer = (bool) $user?->isCustomer();
        $canManageBilling = $user && $user->hasAnyRole(['super_admin', 'cashier', 'receptionist']);

        $billingsQuery = Billing::with(['client', 'pet', 'appointment', 'serviceCatalog', 'payments'])
            ->latest();

        if ($isCustomer) {
            $billingsQuery->where('client_id', $this->customerClientId($user));
        }

        return Inertia::render('Billing/Index', [
            'billings' => $billingsQuery->get(),
            'clients' => $canManageBilling ? Client::orderBy('name')->get(['id', 'name']) : [],
            'pets' => $canManageBilling ? Pet::with('client')->orderBy('pet_name')->get() : [],
            'serviceCatalogs' => $canManageBilling
                ? ServiceCatalog::query()->orderBy('name')->get(['id', 'code', 'name', 'category', 'default_price'])
                : [],
            'billablePets' => $canManageBilling ? $this->billablePets() : [],
            'can_manage_billing' => $canManageBilling,
            'appointments' => $canManageBilling
                ? Appointment::with(['pet:id,pet_name,client_id', 'client:id,name'])
                    ->where('status', 'completed')
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
                    ->values()
                : [],
        ]);
    }

    /**
     * Auto-build an invoice from a pet's unbilled, priced health records so the
     * cashier does not have to compute charges manually.
     */
    public function generateFromPet(Pet $pet): RedirectResponse
    {
        $records = $pet->healthRecords()
            ->whereNull('billing_id')
            ->where('line_total', '>', 0)
            ->get();

        if ($records->isEmpty()) {
            return redirect()
                ->route('billing.index')
                ->withErrors(['pet_id' => 'This pet has no unbilled services to invoice.']);
        }

        $subtotal = (float) $records->sum('line_total');

        $billing = DB::transaction(function () use ($pet, $records, $subtotal) {
            $billing = Billing::create([
                'invoice_number' => $this->generateInvoiceNumber(),
                'client_id' => $pet->client_id,
                'pet_id' => $pet->id,
                'subtotal' => $subtotal,
                'tax' => 0,
                'discount' => 0,
                'total_amount' => $subtotal,
                'amount_paid' => 0,
                'status' => 'unpaid',
                'notes' => 'Auto-generated from health records: '
                    .$records->pluck('title')->implode(', '),
            ]);

            HealthRecord::whereIn('id', $records->pluck('id'))
                ->update(['billing_id' => $billing->id]);

            return $billing;
        });

        return redirect()
            ->route('billing.index')
            ->with('success', "Invoice {$billing->invoice_number} generated from {$records->count()} service(s).");
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'pet_id' => 'nullable|exists:pets,id',
            'appointment_id' => [
                'nullable',
                Rule::exists('appointments', 'id')->where(
                    fn ($query) => $query->where('status', 'completed')
                ),
            ],
            'service_catalog_id' => 'nullable|exists:service_catalogs,id',
            'service_unit_price' => 'required|numeric|min:0',
            'service_quantity' => 'required|integer|min:1',
            'subtotal' => 'required|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $tax = (float) ($validated['tax'] ?? 0);
        $discount = (float) ($validated['discount'] ?? 0);
        $subtotal = $this->resolvedSubtotal($validated);
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
            'appointment_id' => [
                'nullable',
                Rule::exists('appointments', 'id')->where(
                    fn ($query) => $query->where('status', 'completed')
                ),
            ],
            'service_catalog_id' => 'nullable|exists:service_catalogs,id',
            'service_unit_price' => 'required|numeric|min:0',
            'service_quantity' => 'required|integer|min:1',
            'subtotal' => 'required|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'status' => 'required|in:unpaid,partial,paid,cancelled',
        ]);

        $tax = (float) ($validated['tax'] ?? 0);
        $discount = (float) ($validated['discount'] ?? 0);
        $subtotal = $this->resolvedSubtotal($validated);
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
        $user = $this->currentUser();
        if ($user?->isCustomer() && (int) $billing->client_id !== $this->customerClientId($user)) {
            abort(403, 'You can only view your own receipts.');
        }

        $billing->load(['client', 'pet', 'appointment', 'serviceCatalog', 'payments' => fn ($query) => $query->orderBy('paid_at')]);

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
                'service_catalog' => $billing->serviceCatalog,
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

    /**
     * Pets that have unbilled, priced health records ready for invoicing.
     *
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function billablePets()
    {
        return Pet::with('client:id,name')
            ->whereHas('healthRecords', fn ($query) => $query
                ->whereNull('billing_id')
                ->where('line_total', '>', 0))
            ->withSum(['healthRecords as unbilled_total' => fn ($query) => $query
                ->whereNull('billing_id')
                ->where('line_total', '>', 0)], 'line_total')
            ->withCount(['healthRecords as unbilled_count' => fn ($query) => $query
                ->whereNull('billing_id')
                ->where('line_total', '>', 0)])
            ->orderBy('pet_name')
            ->get()
            ->map(fn (Pet $pet) => [
                'id' => $pet->id,
                'pet_name' => $pet->pet_name,
                'client_name' => $pet->client?->name,
                'unbilled_total' => (float) $pet->unbilled_total,
                'unbilled_count' => (int) $pet->unbilled_count,
            ])
            ->values();
    }

    private function currentUser(): ?User
    {
        $user = auth()->user();

        return $user instanceof User ? $user : null;
    }

    private function customerClientId(User $user): int
    {
        if (! $user->client_id) {
            abort(403, 'Your customer account is not linked to a client record.');
        }

        return (int) $user->client_id;
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

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolvedSubtotal(array $validated): float
    {
        if (! empty($validated['service_catalog_id'])) {
            return max(
                ((float) $validated['service_unit_price']) * ((int) $validated['service_quantity']),
                0
            );
        }

        return max((float) ($validated['subtotal'] ?? 0), 0);
    }
}
