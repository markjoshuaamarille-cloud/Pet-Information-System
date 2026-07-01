<?php

namespace App\Http\Controllers;

use App\Models\Billing;
use App\Models\Payment;
use App\Models\User;
use App\Support\PetShopBilling;
use App\Support\ClinicContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PetShopBillingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $this->currentUser();
        $canManage = (bool) $user?->hasAnyRole(['super_admin', 'cashier', 'receptionist', 'clinic_owner']);
        $clinicId  = $request->attributes->get('active_clinic_id');

        $orders = Billing::query()
            ->with(['client', 'lineItems.medicine', 'payments'])
            ->where('sale_type', 'pet_shop_retail')
            ->forClinic($clinicId)
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

        return Inertia::render('PetShopBilling/Index', [
            'orders' => $orders,
            'stats' => $stats,
            'can_manage' => $canManage,
            'can_delete_billing' => (bool) $user?->isPlatformAdmin(),
        ]);
    }

    public function receipt(Billing $billing): Response
    {
        $this->ensureRetailOrder($billing);

        $billing->load([
            'clinic:id,name,contact,email,address,address_formatted,city,province',
            'client.users:id,client_id,contact',
            'lineItems.medicine:id,name,category,unit_price',
            'payments' => fn ($query) => $query->orderBy('paid_at'),
        ]);

        PetShopBilling::withLivePricing($billing);

        if ($billing->client) {
            $billing->client->setAttribute(
                'contact',
                $billing->client->effectiveContact() ?? '—',
            );
        }

        return Inertia::render('PetShopBilling/Receipt', [
            'order' => $billing,
        ]);
    }

    public function update(Request $request, Billing $billing): RedirectResponse
    {
        $this->ensureRetailOrder($billing);
        $this->ensureCanManage($this->currentUser());
        $this->ensureBillingForActiveClinic($request, $billing);

        if ($billing->inventory_deducted) {
            return redirect()
                ->back()
                ->withErrors(['order' => 'Paid orders with deducted inventory cannot be repriced.']);
        }

        if ($billing->status === 'paid') {
            return redirect()
                ->back()
                ->withErrors(['order' => 'Paid orders cannot be edited.']);
        }

        $validated = $request->validate([
            'tax_applied' => 'required|boolean',
            'tax_rate' => 'required|numeric|min:0|max:100',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $billing->update([
            'tax_applied' => $request->boolean('tax_applied'),
            'tax_rate' => $validated['tax_rate'],
            'discount' => (float) ($validated['discount'] ?? 0),
            'notes' => $validated['notes'] ?? $billing->notes,
        ]);

        PetShopBilling::applyLivePricingToOpenOrder($billing);
        $billing->refresh();
        PetShopBilling::recalculateTotals($billing);

        return redirect()->back()->with('success', 'Order updated successfully.');
    }

    public function storePayment(Request $request, Billing $billing): RedirectResponse
    {
        $this->ensureRetailOrder($billing);
        $user = $this->currentUser();
        $this->ensureCanManage($user);
        $this->ensureBillingForActiveClinic($request, $billing);

        if ($billing->status === 'cancelled') {
            return redirect()->back()->withErrors(['payment' => 'Cancelled orders cannot receive payments.']);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:cash,card,gcash,maya,bank_transfer',
            'paid_at' => 'required|date',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::transaction(function () use ($billing, $validated): void {
                PetShopBilling::applyLivePricingToOpenOrder($billing);
                $billing->refresh();

                Payment::create([
                    'billing_id' => $billing->id,
                    ...$validated,
                ]);

                $billing->refresh();
                $newAmountPaid = (float) $billing->amount_paid + (float) $validated['amount'];
                $status = PetShopBilling::statusFromAmounts(
                    $newAmountPaid,
                    (float) $billing->total_amount,
                    $billing->status,
                );

                $billing->update([
                    'amount_paid' => min($newAmountPaid, (float) $billing->total_amount),
                    'status' => $status,
                ]);

                if ($status === 'paid') {
                    PetShopBilling::deductInventory($billing);
                }
            });
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
        }

        return redirect()->back()->with('success', 'Payment recorded successfully.');
    }

    public function destroy(Request $request, Billing $billing): RedirectResponse
    {
        $this->ensureRetailOrder($billing);
        $user = $this->currentUser();

        if (! $user?->isPlatformAdmin()) {
            abort(403, 'Only a super admin can delete invoices.');
        }

        $this->ensureBillingForActiveClinic($request, $billing);

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

        if ($billing->inventory_deducted) {
            PetShopBilling::restoreInventory($billing);
        }

        $billing->delete();

        return redirect()->back()->with('success', 'Order deleted.');
    }

    private function ensureRetailOrder(Billing $billing): void
    {
        if (! $billing->isRetail()) {
            abort(404);
        }
    }

    private function ensureCanManage(?User $user): void
    {
        if (! $user?->hasAnyRole(['super_admin', 'cashier', 'receptionist', 'clinic_owner'])) {
            abort(403);
        }
    }

    private function ensureBillingForActiveClinic(Request $request, Billing $billing): void
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        if ($clinicId !== null && (int) $billing->clinic_id !== (int) $clinicId) {
            abort(403);
        }
    }

    private function currentUser(): ?User
    {
        $user = auth()->user();

        return $user instanceof User ? $user : null;
    }
}
