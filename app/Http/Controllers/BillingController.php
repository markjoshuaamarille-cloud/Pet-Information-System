<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Billing;
use App\Models\BillingLineItem;
use App\Models\Client;
use App\Models\HealthRecord;
use App\Models\Payment;
use App\Models\Pet;
use App\Models\ServiceCatalog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
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

        // For the edit-invoice form: clients, pets, service catalogs, appointments
        $clients = collect();
        $pets = collect();
        $serviceCatalogs = collect();
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
            'can_manage_billing' => $canManageBilling,
            'can_delete_billing' => (bool) ($user?->hasAnyRole(['super_admin', 'clinic_owner'])),
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
        $recordIds = $request->input('health_record_ids');

        if (is_array($recordIds) && count($recordIds) > 0) {
            $request->merge([
                'pet_id' => $pet->id,
                'client_id' => $pet->client_id,
                'health_record_ids' => $recordIds,
            ]);

            return $this->checkout($request);
        }

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

        $request->merge([
            'client_id' => $pet->client_id,
            'pet_id' => $pet->id,
            'health_record_ids' => $records->pluck('id')->all(),
            'tax' => ClinicBilling::suggestedChargesFromRecords($records)['tax'],
            'discount' => ClinicBilling::suggestedChargesFromRecords($records)['discount'],
        ]);

        return $this->checkout($request);
    }

    /**
     * Unified checkout: selected health records + optional walk-in lines → one invoice.
     */
    public function checkout(Request $request): RedirectResponse
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
            'health_record_ids' => 'array',
            'health_record_ids.*' => 'integer|exists:health_records,id',
            'extra_lines' => 'array',
            'extra_lines.*.description' => 'required|string|max:255',
            'extra_lines.*.quantity' => 'required|integer|min:1',
            'extra_lines.*.unit_price' => 'required|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'collect_payment' => 'boolean',
            'payment.amount' => 'required_if:collect_payment,true|nullable|numeric|min:0.01',
            'payment.method' => 'required_if:collect_payment,true|nullable|in:cash,card,gcash,maya,bank_transfer',
            'payment.paid_at' => 'required_if:collect_payment,true|nullable|date',
            'payment.reference_number' => 'nullable|string|max:255',
            'payment.notes' => 'nullable|string',
        ]);

        $clinicId = ClinicContext::activeClinicId($request);

        if (! $clinicId) {
            return redirect()
                ->back()
                ->withErrors(['clinic_id' => 'Select your clinic before checking out.']);
        }

        $recordIds = $validated['health_record_ids'] ?? [];
        $extraLines = $validated['extra_lines'] ?? [];

        if (count($recordIds) === 0 && count($extraLines) === 0) {
            return redirect()
                ->back()
                ->withErrors(['health_record_ids' => 'Select at least one service or add a walk-in charge.']);
        }

        $recordsQuery = HealthRecord::query()
            ->whereIn('id', $recordIds)
            ->billableForCheckout()
            ->where('clinic_id', $clinicId);

        $records = $recordsQuery->get();

        if ($records->count() !== count($recordIds)) {
            return redirect()
                ->back()
                ->withErrors(['health_record_ids' => 'One or more selected services are no longer available to bill.']);
        }

        $recordPetIds = $records->pluck('pet_id')->unique()->values();
        $recordClientIds = $records->loadMissing('pet')->pluck('pet.client_id')->unique()->filter();

        if ($recordClientIds->count() > 1 || ($recordClientIds->isNotEmpty() && (int) $recordClientIds->first() !== (int) $validated['client_id'])) {
            return redirect()
                ->back()
                ->withErrors(['client_id' => 'Selected services must belong to the chosen client.']);
        }

        if ($recordPetIds->count() > 1) {
            if (empty($validated['pet_id'])) {
                return redirect()
                    ->back()
                    ->withErrors(['pet_id' => 'Selected services belong to different pets. Choose one pet at a time.']);
            }

            $invalidPet = $records->first(fn (HealthRecord $record) => (int) $record->pet_id !== (int) $validated['pet_id']);
            if ($invalidPet) {
                return redirect()
                    ->back()
                    ->withErrors(['pet_id' => 'All selected services must belong to the chosen pet.']);
            }
        }

        if (! empty($validated['pet_id'])) {
            $invalidPet = $records->first(fn (HealthRecord $record) => (int) $record->pet_id !== (int) $validated['pet_id']);
            if ($invalidPet) {
                return redirect()
                    ->back()
                    ->withErrors(['pet_id' => 'All selected services must belong to the chosen pet.']);
            }
        }

        $suggested = ClinicBilling::suggestedChargesFromRecords($records);
        $invoiceTax = (float) ($validated['tax'] ?? $suggested['tax']);
        $invoiceDiscount = (float) ($validated['discount'] ?? $suggested['discount']);
        $charges = ClinicBilling::checkoutTotals($records, $extraLines, $invoiceTax, $invoiceDiscount);

        $petId = $validated['pet_id'] ?? ($recordPetIds->count() === 1 ? $recordPetIds->first() : null);

        $billing = DB::transaction(function () use ($validated, $records, $extraLines, $charges, $clinicId, $petId, $request) {
            $billing = Billing::create([
                'clinic_id'      => $clinicId,
                'invoice_number' => ClinicBilling::generateInvoiceNumber(),
                'sale_type'      => 'clinic_service',
                'client_id'      => $validated['client_id'],
                'pet_id'         => $petId,
                'appointment_id' => $validated['appointment_id'] ?? null,
                'subtotal'       => $charges['subtotal'],
                'tax'            => $charges['tax'],
                'tax_applied'    => $charges['tax_applied'],
                'tax_rate'       => $charges['tax_rate'],
                'discount'       => $charges['discount'],
                'total_amount'   => $charges['total'],
                'amount_paid'    => 0,
                'status'         => 'unpaid',
                'due_date'       => $validated['due_date'] ?? null,
                'notes'          => $validated['notes']
                    ?? $this->checkoutNotesFromRecords($records, $extraLines),
            ]);

            foreach ($records as $record) {
                BillingLineItem::create([
                    'billing_id'  => $billing->id,
                    'description' => $record->title,
                    'quantity'    => max((int) $record->quantity, 1),
                    'unit_price'  => (float) $record->unit_price,
                    'line_total'  => (float) $record->line_total,
                ]);

                $record->update([
                    'billing_id' => $billing->id,
                    'invoiced_at' => now(),
                ]);
            }

            foreach ($extraLines as $line) {
                $quantity = max((int) $line['quantity'], 1);
                $unitPrice = (float) $line['unit_price'];
                BillingLineItem::create([
                    'billing_id'  => $billing->id,
                    'description' => $line['description'],
                    'quantity'    => $quantity,
                    'unit_price'  => $unitPrice,
                    'line_total'  => round($unitPrice * $quantity, 2),
                ]);
            }

            if ($request->boolean('collect_payment') && ! empty($validated['payment']['amount'])) {
                $paymentData = $validated['payment'];
                Payment::create([
                    'billing_id' => $billing->id,
                    'amount' => (float) $paymentData['amount'],
                    'method' => $paymentData['method'],
                    'paid_at' => $paymentData['paid_at'],
                    'reference_number' => $paymentData['reference_number'] ?? null,
                    'notes' => $paymentData['notes'] ?? null,
                ]);

                $amountPaid = min((float) $paymentData['amount'], $charges['total']);
                $status = $this->statusFromAmounts($amountPaid, $charges['total'], 'unpaid');

                $billing->update([
                    'amount_paid' => $amountPaid,
                    'status' => $status,
                ]);
            }

            $this->syncAppointmentBillingStatus($billing);

            return $billing->fresh();
        });

        $message = "Invoice {$billing->invoice_number} created.";
        if ($request->boolean('collect_payment')) {
            $message .= $billing->status === 'paid' ? ' Payment recorded.' : ' Partial payment recorded.';
        }

        return redirect()
            ->route('billing.receipt', $billing)
            ->with('success', $message);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, HealthRecord>  $records
     * @param  array<int, array{description: string}>  $extraLines
     */
    private function checkoutNotesFromRecords($records, array $extraLines): string
    {
        $parts = $records->pluck('title')->all();

        foreach ($extraLines as $line) {
            $parts[] = $line['description'];
        }

        return 'Checkout: '.implode(', ', $parts);
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

        $this->syncAppointmentBillingStatus($billing->fresh());

        return redirect()->back()->with('success', 'Invoice updated successfully.');
    }

    public function destroy(Request $request, Billing $billing): RedirectResponse
    {
        $user = $this->currentUser();

        if (! $user?->hasAnyRole(['super_admin', 'clinic_owner'])) {
            abort(403, 'Only a super admin or clinic owner can delete invoices.');
        }

        if ($user->isClinicOwner() && ! $user->isPlatformAdmin()) {
            $clinicId = ClinicContext::activeClinicId($request) ?? $billing->clinic_id;

            if (! $clinicId || (int) $billing->clinic_id !== (int) $clinicId) {
                abort(403, 'You can only delete invoices for your active clinic.');
            }

            if (! $user->clinics()->where('clinics.id', $clinicId)->exists()) {
                abort(403, 'You are not assigned to this clinic.');
            }
        }

        $request->validate([
            'password' => ['required', 'string'],
        ], [
            'password.required' => 'Your password is required to delete an invoice.',
        ]);

        if (! Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages([
                'password' => 'The password you entered is incorrect.',
            ]);
        }

        DB::transaction(function () use ($billing): void {
            $appointmentId = $billing->appointment_id;
            $wasPaid = $billing->status === 'paid';

            HealthRecord::query()
                ->where('billing_id', $billing->id)
                ->whereNull('invoiced_at')
                ->update(['invoiced_at' => now()]);

            $billing->delete();

            if ($appointmentId) {
                Appointment::query()
                    ->whereKey($appointmentId)
                    ->update([
                        'billing_status' => $wasPaid ? 'paid' : null,
                    ]);
            }
        });

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

            $this->syncAppointmentBillingStatus($billing->fresh());
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

    private function syncAppointmentBillingStatus(Billing $billing): void
    {
        if (! $billing->appointment_id) {
            return;
        }

        Appointment::query()
            ->whereKey($billing->appointment_id)
            ->update([
                'billing_status' => $billing->status === 'cancelled'
                    ? null
                    : $billing->status,
            ]);
    }
}
