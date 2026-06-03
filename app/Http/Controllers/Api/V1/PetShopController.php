<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\BillingResource;
use App\Http\Resources\ClientResource;
use App\Http\Resources\MedicineResource;
use App\Models\Billing;
use App\Models\BillingLineItem;
use App\Models\Client;
use App\Models\Medicine;
use App\Models\Payment;
use App\Support\InvoiceNumberGenerator;
use App\Support\PetShopBilling;
use App\Support\PetShopCategories;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * @group Pet Shop
 */
class PetShopController extends Controller
{
    private const PRODUCT_IMAGE_PATH = 'pets/pet-shop';

    public function index(): JsonResponse
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
            ->map(function (Medicine $medicine) {
                $medicine->setAttribute('category_label', PetShopCategories::label($medicine->category));
                $medicine->setAttribute('stock_status', $medicine->stockStatus());

                return $medicine;
            });

        return $this->success([
            'products' => MedicineResource::collection($products),
            'categories' => collect(PetShopCategories::labels())
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
                ->values(),
            'clients' => $canSelectClient ? ClientResource::collection(Client::orderBy('name')->get(['id', 'name', 'contact', 'email', 'address'])) : [],
            'can_manage_products' => $canManageProducts,
            'can_checkout' => $canCheckout,
            'can_select_client' => $canSelectClient,
            'customer_client_id' => $customerClientId,
        ]);
    }

    public function update(Request $request, Medicine $medicine): JsonResponse
    {
        if (! PetShopCategories::isShopCategory($medicine->category)) {
            return response()->json(['message' => 'This product category is not available in the pet shop.'], 422);
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
                return response()->json(['message' => 'Failed to upload image to storage.'], 422);
            }

            $validated['image_path'] = $path;
        }

        unset($validated['image'], $validated['remove_image']);
        $medicine->update($validated);

        return $this->success(['product' => new MedicineResource($medicine->fresh())], 'Product updated successfully.');
    }

    public function checkout(Request $request): JsonResponse
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
                return response()->json(['message' => 'Your account is not linked to a client record.'], 422);
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
            return response()->json(['message' => 'One or more products are invalid for pet shop sale.'], 422);
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
                return response()->json([
                    'message' => "Insufficient stock for {$medicine->name}. Available: {$medicine->quantity}.",
                ], 422);
            }

            $unitPrice = (float) $medicine->unit_price;
            $lineTotal = round($unitPrice * $quantity, 2);
            $subtotal += $lineTotal;

            $lineItems[] = [
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
                'invoice_number' => InvoiceNumberGenerator::generate(),
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
                    ...$lineItem,
                ]);
            }

            return $billing;
        });

        return $this->created([
            'billing' => new BillingResource($billing->load(['client', 'lineItems.medicine'])),
        ], "Order {$billing->invoice_number} created.");
    }
}
