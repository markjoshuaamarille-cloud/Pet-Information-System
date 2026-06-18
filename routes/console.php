<?php

use App\Models\Pet;
use App\Models\SystemNotification;
use App\Models\Vaccination;
use App\Support\NoShowAppointmentCancellation;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('reminders:vaccinations', function () {
    $dueSoon = Vaccination::with(['pet.client'])
        ->whereNotNull('next_due_date')
        ->whereDate('next_due_date', '>=', today())
        ->whereDate('next_due_date', '<=', today()->addDays(3))
        ->get();

    $created = 0;

    foreach ($dueSoon as $vaccination) {
        $pet = $vaccination->pet;

        if (! $pet) {
            continue;
        }

        $client = $pet->client;
        $scheduledFor = $vaccination->next_due_date;

        $notification = SystemNotification::firstOrCreate(
            [
                'type' => 'vaccination_due',
                'pet_id' => $pet->id,
                'scheduled_for' => $scheduledFor,
            ],
            [
                'client_id' => $client?->id,
                'severity' => 'warning',
                'title' => 'Vaccination Due Soon',
                'message' => sprintf(
                    '%s is due for %s on %s.',
                    $pet->pet_name,
                    $vaccination->vaccine_name,
                    $scheduledFor->format('M d, Y')
                ),
                'sent_at' => now(),
            ]
        );

        if ($notification->wasRecentlyCreated) {
            $created++;
        }
    }

    $this->info("Vaccination reminders created: {$created}");
})->purpose('Generate notifications for upcoming vaccination due dates');

Schedule::command('reminders:vaccinations')->dailyAt('08:00');

Artisan::command('pets:purge-deactivated', function () {
    $purged = Pet::purgeDeactivatedBeyondOneYear();
    $this->info("Deactivated pets purged: {$purged}");
})->purpose('Delete pet records deactivated for one year or longer');

Schedule::command('pets:purge-deactivated')->dailyAt('02:00');

Artisan::command('appointments:cancel-no-shows', function () {
    $cancelled = NoShowAppointmentCancellation::cancelDueAppointments();

    $this->info("No-show appointments auto-cancelled: {$cancelled}");
})->purpose('Cancel scheduled appointments that were missed past the grace period');

Schedule::command('appointments:cancel-no-shows')->hourly();
