<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\AppointmentResource;
use App\Http\Resources\BillingResource;
use App\Http\Resources\ClientResource;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\PetResource;
use App\Models\Appointment;
use App\Models\Billing;
use App\Models\Client;
use App\Models\HealthRecord;
use App\Models\Payment;
use App\Models\Pet;
use App\Models\ServiceCatalog;
use App\Support\ClinicServices;
use App\Support\InvoiceNumberGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * @group Billing
 */
class BillingController extends Controller
{
    public function index(): JsonResponse
    {
        $user = $this->currentUser();
        $canManageBilling = $user && $user->hasAnyRole(['super_admin', 'cashier', 'receptionist']);

        return $this->success([
            'billings' => BillingResource::collection(
                Billing::with(['client', 'pet', 'appointment', 'serviceCatalog', 'payments', 'lineItems.medicine'])
                    ->where(fn ($q) => $q->where('sale_type', 'clinic_service')->orWhereNull('sale_type'))
                    ->latest()
                    ->get()
            ),
            'clients' => $canManageBilling ? ClientResource::collection(Client::orderBy('name')->get(['id', 'name', 'contact', 'email', 'address'])) : [],
            'pets' => $canManageBilling ? PetResource::collection(Pet::with('client')->orderBy('pet_name')->get()) : [],
            'service_catalogs' => $canManageBilling
                ? ServiceCatalog::query()->orderBy('name')->get(['id', 'code', 'name', 'category', 'default_price'])
                : [],
            'billable_pets' => $canManageBilling ? $this->billablePets() : [],
            'can_manage_billing' => $canManageBilling,
            'appointments' => $canManageBilling
                ? AppointmentResource::collection(
                    Appointment::with(['pet:id,pet_name,client_id', 'client:id,name'])
                        ->where('status', 'completed')
                        ->orderByDesc('scheduled_at')
                        ->get()
                )
                : [],
        ]);
    }

    public function generateFromPet(Pet $pet): JsonResponse
    {
        $records = $pet->healthRecords()
            ->whereNull('billing_id')
            ->where('line_total', '>', 0)
            ->get();

        if ($records->isEmpty()) {
            return response()->json(['message' => 'This pet has no unbilled services to invoice.'], 422);
        }

        $subtotal = (float) $records->sum('line_total');

        $billing = DB::transaction(function () use ($pet, $records, $subtotal) {
            $billing = Billing::create([
                'invoice_number' => InvoiceNumberGenerator::generate(),
                'client_id' => $pet->client_id,
                'pet_id' => $pet->id,
                'subtotal' => $subtotal,
                'tax' => 0,
                'discount' => 0,
                'total_amount' => $subtotal,
                'amount_paid' => 0,
                'status' => 'unpaid',
                'notes' => 'Auto-generated from health records: '.$records->pluck('title')->implode(', '),
            ]);

            HealthRecord::whereIn('id', $records->pluck('id'))->update(['billing_id' => $billing->id]);

            return $billing;
        });

        return $this->created([
            'billing' => new BillingResource($billing->load(['client', 'pet', 'payments'])),
        ], "Invoice {$billing->invoice_number} generated from {$records->count()} service(s).");
    }

    public function store(Request $request): JsonResponse
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

        $billing = Billing::create([
            ...$validated,
            'invoice_number' => InvoiceNumberGenerator::generate(),
            'tax' => $tax,
            'discount' => $discount,
            'total_amount' => $total,
            'amount_paid' => 0,
            'status' => 'unpaid',
        ]);

        return $this->created(['billing' => new BillingResource($billing->load(['client', 'pet']))]);
    }

    public function show(Billing $billing): JsonResponse
    {
        $billing->load(['client', 'pet', 'appointment', 'serviceCatalog', 'lineItems.medicine', 'payments']);

        return $this->success(['billing' => new BillingResource($billing)]);
    }

    public function update(Request $request, Billing $billing): JsonResponse
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

        return $this->success(['billing' => new BillingResource($billing->fresh()->load(['client', 'pet', 'payments']))]);
    }

    public function destroy(Billing $billing): JsonResponse
    {
        $billing->delete();

        return $this->deleted('Invoice deleted.');
    }

    public function storePayment(Request $request, Billing $billing): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:cash,card,gcash,maya,bank_transfer',
            'paid_at' => 'required|date',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $payment = DB::transaction(function () use ($billing, $validated) {
            $payment = Payment::create(['billing_id' => $billing->id, ...$validated]);
            $newAmountPaid = (float) $billing->amount_paid + (float) $validated['amount'];
            $status = $this->statusFromAmounts($newAmountPaid, (float) $billing->total_amount, $billing->status);

            $billing->update([
                'amount_paid' => min($newAmountPaid, (float) $billing->total_amount),
                'status' => $status,
            ]);

            return $payment;
        });

        return $this->created([
            'payment' => new PaymentResource($payment),
            'billing' => new BillingResource($billing->fresh()->load('payments')),
        ], 'Payment posted successfully.');
    }

    public function receipt(Billing $billing): JsonResponse
    {
        $billing->load([
            'client', 'pet', 'appointment', 'serviceCatalog', 'lineItems.medicine',
            'payments' => fn ($query) => $query->orderBy('paid_at'),
        ]);

        $appointment = $billing->appointment;

        return $this->success([
            'billing' => new BillingResource($billing),
            'service_label' => $appointment ? ClinicServices::label($appointment->getAttribute('type')) : null,
        ]);
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function billablePets()
    {
        return Pet::with('client:id,name')
            ->whereHas('healthRecords', fn ($query) => $query->whereNull('billing_id')->where('line_total', '>', 0))
            ->withSum(['healthRecords as unbilled_total' => fn ($query) => $query->whereNull('billing_id')->where('line_total', '>', 0)], 'line_total')
            ->withCount(['healthRecords as unbilled_count' => fn ($query) => $query->whereNull('billing_id')->where('line_total', '>', 0)])
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
            return max(((float) $validated['service_unit_price']) * ((int) $validated['service_quantity']), 0);
        }

        return max((float) ($validated['subtotal'] ?? 0), 0);
    }
}
