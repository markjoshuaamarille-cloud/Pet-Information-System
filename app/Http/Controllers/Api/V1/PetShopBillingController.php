<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\BillingResource;
use App\Http\Resources\PaymentResource;
use App\Models\Billing;
use App\Models\Payment;
use App\Support\PetShopBilling;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * @group Pet Shop Billing
 */
class PetShopBillingController extends Controller
{
    public function index(): JsonResponse
    {
        $user = $this->currentUser();
        $canManage = (bool) $user?->hasAnyRole(['super_admin', 'cashier', 'receptionist']);

        $orders = Billing::query()
            ->with(['client', 'lineItems.medicine', 'payments'])
            ->where('sale_type', 'pet_shop_retail')
            ->latest()
            ->get()
            ->each(fn (Billing $order) => PetShopBilling::withLivePricing($order));

        $stats = $canManage ? [
            'total_orders' => $orders->count(),
            'pending_orders' => $orders->whereIn('status', ['unpaid', 'partial'])->count(),
            'paid_orders' => $orders->where('status', 'paid')->count(),
            'total_sales' => round((float) $orders->where('status', 'paid')->sum('total_amount'), 2),
            'collected_today' => round((float) Payment::query()
                ->whereHas('billing', fn ($query) => $query->where('sale_type', 'pet_shop_retail'))
                ->whereDate('paid_at', today())
                ->sum('amount'), 2),
        ] : null;

        return $this->success([
            'orders' => BillingResource::collection($orders),
            'stats' => $stats,
            'can_manage' => $canManage,
        ]);
    }

    public function update(Request $request, Billing $billing): JsonResponse
    {
        $this->ensureRetailOrder($billing);
        $this->ensureCanManage($this->currentUser());

        if ($billing->inventory_deducted || $billing->status === 'paid') {
            return response()->json(['message' => 'This order cannot be edited.'], 422);
        }

        $validated = $request->validate([
            'tax_applied' => 'required|boolean',
            'tax_rate' => 'required|numeric|min:0|max:100',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        PetShopBilling::applyLivePricingToOpenOrder($billing);
        $billing->refresh();

        $billing->update([
            'tax_applied' => $request->boolean('tax_applied'),
            'tax_rate' => $validated['tax_rate'],
            'discount' => (float) ($validated['discount'] ?? 0),
            'notes' => $validated['notes'] ?? $billing->notes,
        ]);

        PetShopBilling::recalculateTotals($billing);

        return $this->success(['order' => new BillingResource($billing->fresh()->load(['client', 'lineItems.medicine', 'payments']))]);
    }

    public function storePayment(Request $request, Billing $billing): JsonResponse
    {
        $this->ensureRetailOrder($billing);
        $this->ensureCanManage($this->currentUser());

        if ($billing->status === 'cancelled') {
            return response()->json(['message' => 'Cancelled orders cannot receive payments.'], 422);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:cash,card,gcash,maya,bank_transfer',
            'paid_at' => 'required|date',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        try {
            $payment = DB::transaction(function () use ($billing, $validated) {
                PetShopBilling::applyLivePricingToOpenOrder($billing);
                $billing->refresh();

                $payment = Payment::create(['billing_id' => $billing->id, ...$validated]);
                $billing->refresh();
                $newAmountPaid = (float) $billing->amount_paid + (float) $validated['amount'];
                $status = PetShopBilling::statusFromAmounts($newAmountPaid, (float) $billing->total_amount, $billing->status);

                $billing->update([
                    'amount_paid' => min($newAmountPaid, (float) $billing->total_amount),
                    'status' => $status,
                ]);

                if ($status === 'paid') {
                    PetShopBilling::deductInventory($billing);
                }

                return $payment;
            });
        } catch (ValidationException $exception) {
            return response()->json(['message' => 'Payment failed.', 'errors' => $exception->errors()], 422);
        }

        return $this->created([
            'payment' => new PaymentResource($payment),
            'order' => new BillingResource($billing->fresh()->load(['payments', 'lineItems.medicine'])),
        ], 'Payment recorded successfully.');
    }

    public function destroy(Billing $billing): JsonResponse
    {
        $this->ensureRetailOrder($billing);
        $this->ensureCanManage($this->currentUser());

        if ($billing->status === 'paid') {
            return response()->json(['message' => 'Paid orders cannot be deleted.'], 422);
        }

        if ($billing->inventory_deducted) {
            PetShopBilling::restoreInventory($billing);
        }

        $billing->delete();

        return $this->deleted('Order cancelled and removed.');
    }

    private function ensureRetailOrder(Billing $billing): void
    {
        if (! $billing->isRetail()) {
            abort(404);
        }
    }

    private function ensureCanManage(?\App\Models\User $user): void
    {
        if (! $user?->hasAnyRole(['super_admin', 'cashier', 'receptionist'])) {
            abort(403);
        }
    }
}
