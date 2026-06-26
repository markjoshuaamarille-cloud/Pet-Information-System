<?php

namespace App\Observers;

use App\Models\Payment;
use App\Support\PlatformCommissionService;

class PaymentObserver
{
    public function created(Payment $payment): void
    {
        PlatformCommissionService::recordForPayment($payment);
    }
}
