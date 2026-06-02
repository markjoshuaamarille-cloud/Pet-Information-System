<?php

namespace App\Http\Controllers;

use App\Models\Billing;
use App\Models\BillingLineItem;
use App\Models\Client;
use App\Models\Medicine;
use App\Models\User;
use App\Support\PetShopCategories;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PetShopController extends Controller
{
    private const PRODUCT_IMAGE_PATH = 'pets/pet-shop';
    public function index(): Response
    {
        $user = $this->currentUser();
        $canManageProducts = (bool) $user?->hasRole('super_admin');
        $isCustomer = (bool) $user?->isCustomer();
        $canCheckout = (bool) $user?->hasAnyRole(['super_admin', 'cashier', 'receptionist', 'customer']);
        $canSelectClient = (bool) $user?->hasAnyRole(['super_admin', 'cashier', 'receptionist']);
        $customerClientId = $isCustomer && $user?->client_id ? (int) $user->client_id : null;

        $products = Medicine::query()
            ->whereIn('category', PetShopCategories::shopCategories())
            ->where('quantity', '>', 0)
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->orderBy('name')
            ->get()
            ->map(fn (Medicine $medicine) => [
                ...$medicine->toArray(),
                'category_label' => PetShopCategories::label($medicine->category),
                'stock_status' => $medicine->stockStatus(),
            ])
            ->values();

        return Inertia::render('PetShop/Index', [
            'products' => $products,
            'categories' => collect(PetShopCategories::labels())
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
                ->values(),
            'clients' => $canSelectClient ? Client::orderBy('name')->get(['id', 'name']) : [],
            'canManageProducts' => $canManageProducts,
            'canCheckout' => $canCheckout,
            'canSelectClient' => $canSelectClient,
            'customerClientId' => $customerClientId,
        ]);
    }

    public function update(Request $request, Medicine $medicine): RedirectResponse
    {
        if (! PetShopCategories::isShopCategory($medicine->category)) {
            return redirect()
                ->back()
                ->withErrors(['medicine' => 'This product category is not available in the pet shop.']);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'unit' => 'required|string|max:50',
            'unit_price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'remove_image' => 'nullable|boolean',
        ]);

        if ($request->boolean('remove_image') && $medicine->image_path) {
            Storage::disk('s3')->delete($medicine->image_path);
            $validated['image_path'] = null;
        }

        if ($request->hasFile('image')) {
            if ($medicine->image_path) {
                Storage::disk('s3')->delete($medicine->image_path);
            }

            $path = $request->file('image')->store(self::PRODUCT_IMAGE_PATH, 's3');

            if (! $path) {
                return redirect()
                    ->back()
                    ->withErrors(['image' => 'Failed to upload image to storage. Please try again.']);
            }

            $validated['image_path'] = $path;
        }

        unset($validated['image'], $validated['remove_image']);

        $medicine->update($validated);

        return redirect()->back()->with('success', 'Product updated successfully.');
    }

    public function checkout(Request $request): RedirectResponse
    {
        $user = $this->currentUser();

        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'items' => 'required|array|min:1',
            'items.*.medicine_id' => 'required|integer|exists:medicines,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($user?->isCustomer()) {
            if (! $user->client_id) {
                return redirect()
                    ->back()
                    ->withErrors(['client_id' => 'Your account is not linked to a client record. Please contact the clinic.']);
            }

            if ((int) $validated['client_id'] !== (int) $user->client_id) {
                abort(403, 'You can only place orders for your own account.');
            }
        }

        $medicineIds = collect($validated['items'])->pluck('medicine_id')->unique()->values();
        $medicines = Medicine::query()
            ->whereIn('id', $medicineIds)
            ->whereIn('category', PetShopCategories::shopCategories())
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->get()
            ->keyBy('id');

        if ($medicines->count() !== $medicineIds->count()) {
            return redirect()
                ->back()
                ->withErrors(['items' => 'One or more products are invalid for pet shop sale.']);
        }

        $lineItems = [];
        $subtotal = 0.0;

        foreach ($validated['items'] as $item) {
            $medicine = $medicines->get($item['medicine_id']);

            if (! $medicine) {
                continue;
            }

            $quantity = (int) $item['quantity'];

            if ($medicine->quantity < $quantity) {
                return redirect()
                    ->back()
                    ->withErrors([
                        'items' => "Insufficient stock for {$medicine->name}. Available: {$medicine->quantity}.",
                    ]);
            }

            $unitPrice = (float) $medicine->unit_price;
            $lineTotal = round($unitPrice * $quantity, 2);
            $subtotal += $lineTotal;

            $lineItems[] = [
                'medicine' => $medicine,
                'medicine_id' => $medicine->id,
                'description' => $medicine->name,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
            ];
        }

        $totalAmount = max(round($subtotal, 2), 0);

        $billing = DB::transaction(function () use ($validated, $lineItems, $subtotal, $totalAmount) {
            $billing = Billing::create([
                'invoice_number' => $this->generateInvoiceNumber(),
                'sale_type' => 'pet_shop_retail',
                'client_id' => $validated['client_id'],
                'pet_id' => null,
                'subtotal' => $subtotal,
                'tax' => 0,
                'tax_applied' => false,
                'tax_rate' => 12,
                'discount' => 0,
                'total_amount' => $totalAmount,
                'amount_paid' => 0,
                'status' => 'unpaid',
                'inventory_deducted' => false,
                'notes' => $validated['notes'] ?? 'Pet shop order',
            ]);

            foreach ($lineItems as $lineItem) {
                BillingLineItem::create([
                    'billing_id' => $billing->id,
                    'medicine_id' => $lineItem['medicine_id'],
                    'description' => $lineItem['description'],
                    'quantity' => $lineItem['quantity'],
                    'unit_price' => $lineItem['unit_price'],
                    'line_total' => $lineItem['line_total'],
                ]);
            }

            return $billing;
        });

        return redirect()
            ->route($user?->isCustomer() ? 'pet-shop.index' : 'pet-shop-billing.index')
            ->with('success', $user?->isCustomer()
                ? "Order placed successfully. Invoice {$billing->invoice_number} is pending payment at the clinic."
                : "Order {$billing->invoice_number} created. Process payment in Pet Shop Billing.");
    }

    private function generateInvoiceNumber(): string
    {
        $prefix = 'INV-'.now()->format('Ymd');
        $count = Billing::whereDate('created_at', today())->count() + 1;

        return sprintf('%s-%04d', $prefix, $count);
    }

    private function currentUser(): ?User
    {
        $user = auth()->user();

        return $user instanceof User ? $user : null;
    }
}
