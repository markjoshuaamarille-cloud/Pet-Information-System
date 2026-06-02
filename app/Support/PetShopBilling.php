<?php

namespace App\Support;

use App\Models\Billing;
use App\Models\Medicine;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PetShopBilling
{
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
