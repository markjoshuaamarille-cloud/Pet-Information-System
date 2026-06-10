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
use App\Support\ClinicBilling;
use App\Support\ClinicContext;
use App\Support\ClinicPatientScope;
use App\Support\ClinicScope;
use App\Support\ClinicServices;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $this->currentUser();
        $canManageBilling = $user && $user->hasAnyRole(['super_admin', 'cashier', 'receptionist', 'clinic_owner']);
        $clinicId = ClinicContext::activeClinicId($request);
        $restrictToClinic = ClinicScope::restrictsUnscopedData($user);

        $billingsQuery = ClinicBilling::clinicServiceBillingsQuery($clinicId);
        if ($restrictToClinic && ! $clinicId) {
            $billingsQuery->whereRaw('0 = 1');
        }

        $clients = collect();
        $pets = collect();
        $serviceCatalogs = collect();
        $billablePets = collect();
        $appointments = collect();

        if ($canManageBilling) {
            if ($clinicId) {
                $clients = ClinicPatientScope::clientsQuery($clinicId)
                    ->orderBy('name')
                    ->get(['id', 'name']);
                $pets = ClinicPatientScope::petsQuery($clinicId)
                    ->with('client')
                    ->orderBy('pet_name')
                    ->get();
                $serviceCatalogs = ServiceCatalog::forClinic($clinicId)
                    ->orderBy('name')
                    ->get(['id', 'code', 'name', 'category', 'default_price']);
                $billablePets = ClinicBilling::billablePets($clinicId);
                $appointments = Appointment::with(['pet:id,pet_name,client_id', 'client:id,name'])
                    ->where('clinic_id', $clinicId)
                    ->whereIn('status', ['scheduled', 'completed'])
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
                    ->values();
            } elseif ($user?->isPlatformAdmin()) {
                $clients = Client::orderBy('name')->get(['id', 'name']);
                $pets = Pet::with('client')->orderBy('pet_name')->get();
                $serviceCatalogs = ServiceCatalog::query()->orderBy('name')->get(['id', 'code', 'name', 'category', 'default_price']);
                $billablePets = ClinicBilling::billablePets(null);
                $appointments = Appointment::with(['pet:id,pet_name,client_id', 'client:id,name'])
                    ->whereIn('status', ['scheduled', 'completed'])
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
                    ->values();
            }
        }

        return Inertia::render('Billing/Index', [
            'billings' => $billingsQuery
                ->with(['client', 'pet', 'appointment', 'serviceCatalog', 'payments', 'lineItems.medicine'])
                ->latest()
                ->get(),
            'clients' => $clients,
            'pets' => $pets,
            'serviceCatalogs' => $serviceCatalogs,
            'billablePets' => $billablePets,
            'can_manage_billing' => $canManageBilling,
            'appointments' => $appointments,
            'requires_clinic_context' => $restrictToClinic && ! $clinicId,
        ]);
    }

    /**
     * Auto-build an invoice from a pet's unbilled, priced health records so the
     * cashier does not have to compute charges manually.
     */
    public function generateFromPet(Request $request, Pet $pet): RedirectResponse
    {
        $clinicId = ClinicContext::activeClinicId($request);

        if (! $clinicId) {
            return redirect()
                ->route('billing.index')
                ->withErrors(['pet_id' => 'Select your clinic before generating invoices.']);
        }

        $records = ClinicBilling::unbilledRecordsQuery($pet->id, $clinicId)->get();

        if ($records->isEmpty()) {
            return redirect()
                ->route('billing.index')
                ->withErrors(['pet_id' => 'This pet has no unbilled services to invoice for this clinic.']);
        }

        $charges = ClinicBilling::aggregateServiceCharges($records);

        $billing = DB::transaction(function () use ($pet, $records, $charges, $clinicId) {
            $billing = Billing::create([
                'clinic_id'      => $clinicId,
                'invoice_number' => ClinicBilling::generateInvoiceNumber(),
                'sale_type'      => 'clinic_service',
                'client_id'      => $pet->client_id,
                'pet_id'         => $pet->id,
                'subtotal'       => $charges['subtotal'],
                'tax'            => $charges['tax'],
                'tax_applied'    => $charges['tax_applied'],
                'tax_rate'       => $charges['tax_rate'],
                'discount'       => $charges['discount'],
                'total_amount'   => $charges['total'],
                'amount_paid'    => 0,
                'status'         => 'unpaid',
                'notes'          => 'Auto-generated from health records: '
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

        $clinicId = ClinicContext::activeClinicId($request);

        if (! $clinicId) {
            return redirect()
                ->back()
                ->withErrors(['clinic_id' => 'Select your clinic before creating invoices.']);
        }

        Billing::create([
            ...$validated,
            'clinic_id'      => $clinicId,
            'invoice_number' => ClinicBilling::generateInvoiceNumber(),
            'sale_type'      => 'clinic_service',
            'tax'            => $tax,
            'discount'       => $discount,
            'total_amount'   => $total,
            'amount_paid'    => 0,
            'status'         => 'unpaid',
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
        $billing->load([
            'client',
            'pet',
            'appointment',
            'serviceCatalog',
            'lineItems',
            'payments' => fn ($query) => $query->orderBy('paid_at'),
        ]);

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
                'line_items' => $billing->lineItems,
                'payments' => $billing->payments,
            ],
        ]);
    }

    private function generateInvoiceNumber(): string
    {
        return ClinicBilling::generateInvoiceNumber();
    }

    private function currentUser(): ?User
    {
        $user = auth()->user();

        return $user instanceof User ? $user : null;
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
