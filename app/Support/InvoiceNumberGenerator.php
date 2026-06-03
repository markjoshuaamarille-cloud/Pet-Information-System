<?php

namespace App\Support;

use App\Models\Billing;

class InvoiceNumberGenerator
{
    public static function generate(): string
    {
        $prefix = 'INV-'.now()->format('Ymd');
        $count = Billing::whereDate('created_at', today())->count() + 1;

        return sprintf('%s-%04d', $prefix, $count);
    }
}
