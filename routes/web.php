<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GroomingRecordController;
use App\Http\Controllers\HealthRecordController;
use App\Http\Controllers\MedicineController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PetController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UsabilitySurveyController;
use App\Http\Controllers\VaccinationController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::middleware('role:super_admin,receptionist')->group(function () {
        Route::get('/clients', [ClientController::class, 'index'])->name('clients.index');
        Route::post('/clients', [ClientController::class, 'store'])->name('clients.store');
        Route::put('/clients/{client}', [ClientController::class, 'update'])->name('clients.update');
        Route::delete('/clients/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,customer')->group(function () {
        Route::get('/pets', [PetController::class, 'index'])->name('pets.index');
        Route::post('/pets', [PetController::class, 'store'])->name('pets.store');
        Route::get('/pets/{pet}', [PetController::class, 'show'])->name('pets.show');
        Route::get('/pets/{pet}/client-record', [PetController::class, 'clientRecord'])->name('pets.client-record');
        Route::put('/pets/{pet}', [PetController::class, 'update'])->name('pets.update');
        Route::delete('/pets/{pet}', [PetController::class, 'destroy'])->name('pets.destroy');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist')->group(function () {
        Route::post('/pets/{pet}/health-records', [HealthRecordController::class, 'store'])->name('health-records.store');
        Route::delete('/pets/{pet}/health-records/{healthRecord}', [HealthRecordController::class, 'destroy'])->name('health-records.destroy');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist')->group(function () {
        Route::get('/medicines', [MedicineController::class, 'index'])->name('medicines.index');
        Route::post('/medicines', [MedicineController::class, 'store'])->name('medicines.store');
        Route::put('/medicines/{medicine}', [MedicineController::class, 'update'])->name('medicines.update');
        Route::delete('/medicines/{medicine}', [MedicineController::class, 'destroy'])->name('medicines.destroy');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,customer')->group(function () {
        Route::get('/appointments', [AppointmentController::class, 'index'])->name('appointments.index');
        Route::post('/appointments', [AppointmentController::class, 'store'])->name('appointments.store');
        Route::put('/appointments/{appointment}', [AppointmentController::class, 'update'])->name('appointments.update');
        Route::delete('/appointments/{appointment}', [AppointmentController::class, 'destroy'])->name('appointments.destroy');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist')->group(function () {
        Route::get('/vaccinations', [VaccinationController::class, 'index'])->name('vaccinations.index');
        Route::post('/vaccinations', [VaccinationController::class, 'store'])->name('vaccinations.store');
        Route::put('/vaccinations/{vaccination}', [VaccinationController::class, 'update'])->name('vaccinations.update');
        Route::delete('/vaccinations/{vaccination}', [VaccinationController::class, 'destroy'])->name('vaccinations.destroy');
    });

    Route::middleware('role:super_admin,groomer,receptionist')->group(function () {
        Route::get('/grooming', [GroomingRecordController::class, 'index'])->name('grooming.index');
        Route::post('/grooming', [GroomingRecordController::class, 'store'])->name('grooming.store');
        Route::put('/grooming/{grooming}', [GroomingRecordController::class, 'update'])->name('grooming.update');
        Route::delete('/grooming/{grooming}', [GroomingRecordController::class, 'destroy'])->name('grooming.destroy');
    });

    Route::middleware('role:super_admin,cashier,receptionist')->group(function () {
        Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
        Route::post('/billing', [BillingController::class, 'store'])->name('billing.store');
        Route::put('/billing/{billing}', [BillingController::class, 'update'])->name('billing.update');
        Route::delete('/billing/{billing}', [BillingController::class, 'destroy'])->name('billing.destroy');
        Route::post('/billing/{billing}/payments', [BillingController::class, 'storePayment'])->name('billing.payments.store');
        Route::get('/billing/{billing}/receipt', [BillingController::class, 'receipt'])->name('billing.receipt');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,cashier,customer')->group(function () {
        Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,cashier')->group(function () {
        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('/reports/pets', [ReportController::class, 'pets'])->name('reports.pets');
        Route::get('/reports/inventory', [ReportController::class, 'inventory'])->name('reports.inventory');
        Route::get('/reports/pets/export', [ReportController::class, 'exportPets'])->name('reports.pets.export');
        Route::get('/reports/inventory/export', [ReportController::class, 'exportInventory'])->name('reports.inventory.export');
    });

    Route::middleware('role:super_admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
        Route::post('/users', [UserManagementController::class, 'store'])->name('users.store');
        Route::put('/users/{user}/role', [UserManagementController::class, 'updateRole'])->name('users.role.update');
        Route::delete('/users/{user}', [UserManagementController::class, 'destroy'])->name('users.destroy');
    });

    Route::get('/survey', [UsabilitySurveyController::class, 'create'])->name('survey.create');
    Route::post('/survey', [UsabilitySurveyController::class, 'store'])->name('survey.store');
    Route::get('/survey/results', [UsabilitySurveyController::class, 'results'])->name('survey.results');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
