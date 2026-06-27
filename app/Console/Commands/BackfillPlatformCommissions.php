<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Support\PlatformCommissionService;
use Illuminate\Console\Command;

class BackfillPlatformCommissions extends Command
{
    protected $signature = 'platform-commissions:backfill';

    protected $description = 'Create platform commission records for existing payments';

    public function handle(): int
    {
        $created = 0;

        Payment::query()
            ->with(['billing'])
            ->orderBy('id')
            ->chunkById(200, function ($payments) use (&$created): void {
                foreach ($payments as $payment) {
                    if (PlatformCommissionService::recordForPayment($payment)) {
                        $created++;
                    }
                }
            });

        $this->info("Created {$created} commission record(s).");

        return self::SUCCESS;
    }
}
