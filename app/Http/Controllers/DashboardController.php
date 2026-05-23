<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\HealthRecord;
use App\Models\Medicine;
use App\Models\Pet;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $expiredMedicines = Medicine::expired()->orderBy('expiry_date')->get();
        $criticalMedicines = Medicine::criticalStock()->whereDate('expiry_date', '>=', now())->orderBy('quantity')->get();
        $expiringSoon = Medicine::expiringSoon()->whereDate('expiry_date', '>=', now())->get();

        $upcomingAppointments = Appointment::with(['pet', 'client'])
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>=', now())
            ->orderBy('scheduled_at')
            ->limit(5)
            ->get();

        $dueHealthRecords = HealthRecord::with('pet')
            ->whereNotNull('next_due_date')
            ->whereDate('next_due_date', '<=', now()->addDays(14))
            ->orderBy('next_due_date')
            ->limit(5)
            ->get();

        return Inertia::render('Dashboard', [
            'stats' => [
                'pets' => Pet::count(),
                'clients' => Client::count(),
                'appointments_today' => Appointment::whereDate('scheduled_at', today())->where('status', 'scheduled')->count(),
                'medicines' => Medicine::count(),
            ],
            'expiredMedicines' => $expiredMedicines,
            'criticalMedicines' => $criticalMedicines,
            'expiringSoon' => $expiringSoon,
            'upcomingAppointments' => $upcomingAppointments,
            'dueHealthRecords' => $dueHealthRecords,
        ]);
    }
}
