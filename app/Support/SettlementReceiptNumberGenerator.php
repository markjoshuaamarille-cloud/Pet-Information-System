<?php

namespace App\Support;

use App\Models\PlatformCommissionSettlement;
use Illuminate\Support\Facades\DB;

class SettlementReceiptNumberGenerator
{
    public static function generate(): string
    {
        $dateKey = now()->format('Ymd');
        $prefix = "PCR-{$dateKey}-";
        $lockName = "settlement_receipt_{$dateKey}";

        return DB::transaction(function () use ($prefix, $lockName): string {
            DB::selectOne('SELECT GET_LOCK(?, 10) AS acquired', [$lockName]);

            try {
                $latest = PlatformCommissionSettlement::query()
                    ->where('receipt_number', 'like', $prefix.'%')
                    ->orderByDesc('receipt_number')
                    ->value('receipt_number');

                $next = 1;

                if ($latest !== null && preg_match('/-(\d{4})$/', $latest, $matches)) {
                    $next = ((int) $matches[1]) + 1;
                }

                return sprintf('%s%04d', $prefix, $next);
            } finally {
                DB::selectOne('SELECT RELEASE_LOCK(?)', [$lockName]);
            }
        });
    }
}
