<?php

namespace App\Support;

use App\Models\Billing;
use Illuminate\Support\Facades\DB;

class InvoiceNumberGenerator
{
    /**
     * Next sequential invoice number for today (INV-YYYYMMDD-0001).
     * Uses the highest existing suffix for the date, not row count, so deleted
     * invoices cannot cause duplicate numbers. A day-scoped lock avoids races.
     */
    public static function generate(): string
    {
        $dateKey = now()->format('Ymd');
        $prefix = "INV-{$dateKey}-";
        $lockName = "invoice_number_{$dateKey}";

        return DB::transaction(function () use ($prefix, $lockName): string {
            DB::selectOne('SELECT GET_LOCK(?, 10) AS acquired', [$lockName]);

            try {
                $latest = Billing::query()
                    ->where('invoice_number', 'like', $prefix.'%')
                    ->orderByDesc('invoice_number')
                    ->value('invoice_number');

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
