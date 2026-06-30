<?php

namespace App\Support;

use App\Models\Billing;
use App\Models\Medicine;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PetShopBilling
{
    public static function isOpenForPriceSync(Billing $billing): bool
    {
        return $billing->isRetail()
            && ! $billing->inventory_deducted
            && ! in_array($billing->status, ['paid', 'cancelled'], true);
    }

    public static function withLivePricing(Billing $billing): Billing
    {
        if (! self::isOpenForPriceSync($billing)) {
            return $billing;
        }

        $billing->loadMissing('lineItems.medicine');

        $hasAdjustments = false;
        $subtotal = 0.0;

        foreach ($billing->lineItems as $lineItem) {
            $quotedUnitPrice = (float) $lineItem->unit_price;
            $currentUnitPrice = $lineItem->medicine
                ? (float) $lineItem->medicine->unit_price
                : $quotedUnitPrice;
            $hasAdjustment = abs($quotedUnitPrice - $currentUnitPrice) >= 0.005;

            if ($hasAdjustment) {
                $hasAdjustments = true;
            }

            $displayLineTotal = round($currentUnitPrice * (int) $lineItem->quantity, 2);
            $subtotal += $displayLineTotal;

            $lineItem->setAttribute('quoted_unit_price', $quotedUnitPrice);
            $lineItem->setAttribute('current_unit_price', $currentUnitPrice);
            $lineItem->setAttribute('has_price_adjustment', $hasAdjustment);
            $lineItem->setAttribute('display_line_total', $displayLineTotal);
        }

        $subtotal = round($subtotal, 2);
        $discount = max((float) $billing->discount, 0);
        $tax = $billing->tax_applied
            ? round($subtotal * ((float) $billing->tax_rate / 100), 2)
            : 0.0;
        $displayTotal = max(round($subtotal + $tax - $discount, 2), 0);

        $billing->setAttribute('has_price_adjustments', $hasAdjustments);
        $billing->setAttribute('display_subtotal', $subtotal);
        $billing->setAttribute('display_tax', $tax);
        $billing->setAttribute('display_total_amount', $displayTotal);

        return $billing;
    }

    public static function applyLivePricingToOpenOrder(Billing $billing): bool
    {
        if (! self::isOpenForPriceSync($billing)) {
            return false;
        }

        $billing->loadMissing('lineItems.medicine');
        $changed = false;

        foreach ($billing->lineItems as $lineItem) {
            if (! $lineItem->medicine_id || ! $lineItem->medicine) {
                continue;
            }

            $currentUnitPrice = round((float) $lineItem->medicine->unit_price, 2);
            $currentLineTotal = round($currentUnitPrice * (int) $lineItem->quantity, 2);

            if (
                abs((float) $lineItem->unit_price - $currentUnitPrice) >= 0.005
                || abs((float) $lineItem->line_total - $currentLineTotal) >= 0.005
            ) {
                $lineItem->update([
                    'unit_price' => $currentUnitPrice,
                    'line_total' => $currentLineTotal,
                    'description' => $lineItem->medicine->name,
                ]);
                $changed = true;
            }
        }

        if ($changed) {
            self::recalculateTotals($billing);
        }

        return $changed;
    }

    public static function recalculateTotals(Billing $billing): void
    {
        $billing->loadMissing('lineItems');

        $subtotal = round((float) $billing->lineItems->sum('line_total'), 2);
        $discount = max((float) $billing->discount, 0);
        $taxRate = max((float) $billing->tax_rate, 0);
        $tax = $billing->tax_applied
            ? round($subtotal * ($taxRate / 100), 2)
            : 0.0;
        $total = max(round($subtotal + $tax - $discount, 2), 0);

        $billing->update([
            'subtotal' => $subtotal,
            'tax' => $tax,
            'total_amount' => $total,
            'status' => self::statusFromAmounts((float) $billing->amount_paid, $total, $billing->status),
        ]);
    }

    public static function statusFromAmounts(float $amountPaid, float $totalAmount, string $currentStatus): string
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
     * @throws ValidationException
     */
    public static function deductInventory(Billing $billing): void
    {
        if ($billing->inventory_deducted || ! $billing->isRetail()) {
            return;
        }

        $billing->loadMissing('lineItems');

        DB::transaction(function () use ($billing): void {
            foreach ($billing->lineItems as $lineItem) {
                if (! $lineItem->medicine_id) {
                    continue;
                }

                $medicine = Medicine::query()->lockForUpdate()->find($lineItem->medicine_id);

                if (! $medicine) {
                    throw ValidationException::withMessages([
                        'payment' => "Product #{$lineItem->medicine_id} is no longer available.",
                    ]);
                }

                if ($medicine->quantity < $lineItem->quantity) {
                    throw ValidationException::withMessages([
                        'payment' => "Insufficient stock for {$medicine->name}. Available: {$medicine->quantity}.",
                    ]);
                }

                $medicine->decrement('quantity', $lineItem->quantity);
            }

            $billing->update(['inventory_deducted' => true]);
        });
    }

    public static function restoreInventory(Billing $billing): void
    {
        if (! $billing->inventory_deducted || ! $billing->isRetail()) {
            return;
        }

        $billing->loadMissing('lineItems');

        DB::transaction(function () use ($billing): void {
            foreach ($billing->lineItems as $lineItem) {
                if (! $lineItem->medicine_id) {
                    continue;
                }

                Medicine::query()
                    ->whereKey($lineItem->medicine_id)
                    ->increment('quantity', $lineItem->quantity);
            }

            $billing->update(['inventory_deducted' => false]);
        });
    }
}
