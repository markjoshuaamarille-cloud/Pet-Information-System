<?php

namespace App\Support;

use App\Models\Billing;
use App\Models\Payment;
use App\Models\PlatformCommission;
use App\Models\PlatformSetting;

class PlatformCommissionService
{
    public static function recordForPayment(Payment $payment): ?PlatformCommission
    {
        if (PlatformCommission::query()->where('payment_id', $payment->id)->exists()) {
            return null;
        }

        $billing = $payment->billing()
            ->with(['appointment:id,type', 'healthRecords:id,billing_id,type'])
            ->first();

        if (! $billing || ! $billing->clinic_id || $billing->status === 'cancelled') {
            return null;
        }

        $amount = (float) $payment->amount;

        if ($amount <= 0) {
            return null;
        }

        $rate = PlatformSetting::commissionRate();
        $commission = self::computeAmounts((float) $amount, $rate);

        return PlatformCommission::create([
            'payment_id' => $payment->id,
            'billing_id' => $billing->id,
            'clinic_id' => $billing->clinic_id,
            'invoice_number' => $billing->invoice_number,
            'sale_type' => $billing->sale_type ?? 'clinic_service',
            'business_line' => self::resolveBusinessLine($billing),
            'transaction_amount' => $amount,
            'commission_rate' => $rate,
            'commission_amount' => $commission['commission_amount'],
            'business_earnings' => $commission['business_earnings'],
            'transaction_at' => $payment->paid_at ?? now(),
        ]);
    }

    /**
     * @return array{commission_amount: float, business_earnings: float}
     */
    public static function computeAmounts(float $transactionAmount, float $rate): array
    {
        $commissionAmount = round($transactionAmount * $rate / 100, 2);
        $businessEarnings = round($transactionAmount - $commissionAmount, 2);

        return [
            'commission_amount' => $commissionAmount,
            'business_earnings' => $businessEarnings,
        ];
    }

    public static function recalculateUnsettled(?float $rate = null): int
    {
        $rate ??= PlatformSetting::commissionRate();
        $updated = 0;

        PlatformCommission::query()
            ->whereNull('settlement_id')
            ->orderBy('id')
            ->chunkById(200, function ($commissions) use ($rate, &$updated): void {
                foreach ($commissions as $commission) {
                    $amounts = self::computeAmounts(
                        (float) $commission->transaction_amount,
                        $rate,
                    );

                    $commission->update([
                        'commission_rate' => $rate,
                        'commission_amount' => $amounts['commission_amount'],
                        'business_earnings' => $amounts['business_earnings'],
                    ]);

                    $updated++;
                }
            });

        return $updated;
    }

    public static function resolveBusinessLine(Billing $billing): string
    {
        if ($billing->isRetail()) {
            return 'pet_shop';
        }

        if ($billing->appointment?->getAttribute('type') === 'grooming') {
            return 'grooming';
        }

        $recordTypes = $billing->healthRecords
            ->pluck('type')
            ->filter()
            ->unique()
            ->values();

        if ($recordTypes->isNotEmpty() && $recordTypes->every(fn (string $type) => $type === 'grooming')) {
            return 'grooming';
        }

        return 'veterinary';
    }
}
