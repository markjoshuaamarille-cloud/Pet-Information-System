<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClinicController;
use App\Http\Controllers\ClinicContextController;
use App\Http\Controllers\ClinicRegistrationController;
use App\Http\Controllers\ClinicSuggestController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GroomingRecordController;
use App\Http\Controllers\HealthRecordController;
use App\Http\Controllers\MedicineController;
use App\Http\Controllers\NearbyPlacesController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PetController;
use App\Http\Controllers\PetShopBillingController;
use App\Http\Controllers\PetShopController;
use App\Http\Controllers\PetShopReportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceCatalogController;
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

Route::middleware('throttle:30,1')->group(function () {
    Route::post('/geocode', [NearbyPlacesController::class, 'geocode'])->name('geocode');
    Route::post('/reverse-geocode', [NearbyPlacesController::class, 'reverseGeocode'])->name('reverse-geocode');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::middleware('role:super_admin,receptionist')->group(function () {
        Route::get('/clients', [ClientController::class, 'index'])->name('clients.index');
        Route::post('/clients', [ClientController::class, 'store'])->name('clients.store');
        Route::put('/clients/{client}', [ClientController::class, 'update'])->name('clients.update');
        Route::delete('/clients/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,customer,cashier,clinic_owner')->group(function () {
        Route::get('/pets', [PetController::class, 'index'])->name('pets.index');
        Route::get('/pets/{pet}', [PetController::class, 'show'])->name('pets.show');
        Route::get('/pets/{pet}/client-record', [PetController::class, 'clientRecord'])->name('pets.client-record');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,customer,clinic_owner')->group(function () {
        Route::post('/pets', [PetController::class, 'store'])->name('pets.store');
        Route::put('/pets/{pet}', [PetController::class, 'update'])->name('pets.update');
        Route::delete('/pets/{pet}', [PetController::class, 'destroy'])->name('pets.destroy');
    });

    Route::middleware('role:customer')->group(function () {
        Route::patch('/pets/{pet}/toggle-active', [PetController::class, 'toggleActivation'])->name('pets.toggle-active');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,clinic_owner')->group(function () {
        Route::post('/pets/{pet}/health-records', [HealthRecordController::class, 'store'])->name('health-records.store');
        Route::put('/pets/{pet}/health-records/{healthRecord}', [HealthRecordController::class, 'update'])->name('health-records.update');
        Route::delete('/pets/{pet}/health-records/{healthRecord}/sticker', [HealthRecordController::class, 'destroySticker'])->name('health-records.sticker.destroy');
        Route::delete('/pets/{pet}/health-records/{healthRecord}', [HealthRecordController::class, 'destroy'])->name('health-records.destroy');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,clinic_owner')->group(function () {
        Route::get('/medicines', [MedicineController::class, 'index'])->name('medicines.index');
        Route::post('/medicines', [MedicineController::class, 'store'])->name('medicines.store');
        Route::put('/medicines/{medicine}', [MedicineController::class, 'update'])->name('medicines.update');
        Route::delete('/medicines/{medicine}', [MedicineController::class, 'destroy'])->name('medicines.destroy');
    });

    Route::middleware('role:super_admin,clinic_owner')->group(function () {
        Route::patch('/medicines/{medicine}/toggle-active', [MedicineController::class, 'toggleActive'])->name('medicines.toggle-active');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,cashier,customer,clinic_owner')->group(function () {
        Route::get('/appointments', [AppointmentController::class, 'index'])->name('appointments.index');
        Route::post('/appointments', [AppointmentController::class, 'store'])->name('appointments.store');
        Route::put('/appointments/{appointment}', [AppointmentController::class, 'update'])->name('appointments.update');
        Route::delete('/appointments/{appointment}', [AppointmentController::class, 'destroy'])->name('appointments.destroy');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,clinic_owner')->group(function () {
        Route::post('/appointments/{appointment}/services', [AppointmentController::class, 'storeService'])->name('appointments.store-service');
        Route::put('/appointments/{appointment}/services/{healthRecord}', [AppointmentController::class, 'updateService'])->name('appointments.update-service');
        Route::delete('/appointments/{appointment}/services/{healthRecord}', [AppointmentController::class, 'destroyService'])->name('appointments.destroy-service');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,cashier,clinic_owner')->group(function () {
        Route::get('/vaccinations', [VaccinationController::class, 'index'])->name('vaccinations.index');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,clinic_owner')->group(function () {
        Route::post('/vaccinations', [VaccinationController::class, 'store'])->name('vaccinations.store');
        Route::put('/vaccinations/{vaccination}', [VaccinationController::class, 'update'])->name('vaccinations.update');
        Route::delete('/vaccinations/{vaccination}', [VaccinationController::class, 'destroy'])->name('vaccinations.destroy');
    });

    Route::middleware('role:super_admin,groomer,receptionist,cashier,veterinarian,clinic_owner')->group(function () {
        Route::get('/grooming', [GroomingRecordController::class, 'index'])->name('grooming.index');
    });

    Route::middleware('role:super_admin,groomer,receptionist,clinic_owner')->group(function () {
        Route::post('/grooming', [GroomingRecordController::class, 'store'])->name('grooming.store');
        Route::put('/grooming/{grooming}', [GroomingRecordController::class, 'update'])->name('grooming.update');
        Route::delete('/grooming/{grooming}', [GroomingRecordController::class, 'destroy'])->name('grooming.destroy');
    });

    Route::middleware('role:super_admin,cashier,receptionist,clinic_owner')->group(function () {
        Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
        Route::get('/billing/{billing}/receipt', [BillingController::class, 'receipt'])->name('billing.receipt');
        Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
        Route::put('/billing/{billing}', [BillingController::class, 'update'])->name('billing.update');
        Route::post('/billing/{billing}/payments', [BillingController::class, 'storePayment'])->name('billing.payments.store');
    });

    Route::middleware('role:super_admin,clinic_owner')->group(function () {
        Route::delete('/billing/{billing}', [BillingController::class, 'destroy'])->name('billing.destroy');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,cashier,customer,clinic_owner')->group(function () {
        Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    });

    Route::middleware('role:super_admin,veterinarian,receptionist,cashier,clinic_owner')->group(function () {
        Route::get('/service-catalog', [ServiceCatalogController::class, 'index'])->name('service-catalog.index');
        Route::post('/service-catalog', [ServiceCatalogController::class, 'store'])->name('service-catalog.store');
        Route::put('/service-catalog/{serviceCatalog}', [ServiceCatalogController::class, 'update'])->name('service-catalog.update');
        Route::delete('/service-catalog/{serviceCatalog}', [ServiceCatalogController::class, 'destroy'])->name('service-catalog.destroy');

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
        Route::put('/users/{user}/clinics', [UserManagementController::class, 'updateClinics'])->name('users.clinics.update');
        Route::delete('/users/{user}', [UserManagementController::class, 'destroy'])->name('users.destroy');

        // Clinic management (admin)
        Route::get('/clinics', [ClinicController::class, 'index'])->name('clinics.index');
        Route::post('/clinics', [ClinicController::class, 'store'])->name('clinics.store');
        Route::put('/clinics/{clinic}', [ClinicController::class, 'update'])->name('clinics.update');
        Route::delete('/clinics/{clinic}', [ClinicController::class, 'destroy'])->name('clinics.destroy');
        Route::post('/clinics/{clinic}/approve', [ClinicController::class, 'approve'])->name('clinics.approve');
        Route::post('/clinics/{clinic}/reject', [ClinicController::class, 'reject'])->name('clinics.reject');
        Route::post('/clinics/{clinic}/deactivate', [ClinicController::class, 'deactivate'])->name('clinics.deactivate');
        Route::post('/clinics/{clinic}/activate', [ClinicController::class, 'activate'])->name('clinics.activate');
        Route::post('/clinics/geoapify-import', [ClinicController::class, 'importFromGeoapify'])->name('clinics.geoapify-import');
    });

    // Clinic registration (self-service — any authenticated user)
    Route::get('/register-clinic', [ClinicRegistrationController::class, 'create'])->name('clinic-registration.create');
    Route::post('/register-clinic', [ClinicRegistrationController::class, 'store'])->name('clinic-registration.store');
    Route::post('/register-clinic/geoapify-import', [ClinicController::class, 'importFromGeoapify'])->name('clinic-registration.geoapify-import');

    // Clinic context switcher
    Route::post('/clinic-context', [ClinicContextController::class, 'store'])->name('clinic-context.store');

    // Clinic suggest API (web version for Inertia use)
    Route::post('/clinics/suggest', [ClinicSuggestController::class, 'suggest'])->name('clinics.suggest');

    Route::get('/nearby-places', [NearbyPlacesController::class, 'index'])->name('nearby-places.index');
    Route::post('/nearby-places/geocode', [NearbyPlacesController::class, 'geocode'])->name('nearby-places.geocode');
    Route::post('/nearby-places/reverse-geocode', [NearbyPlacesController::class, 'reverseGeocode'])->name('nearby-places.reverse-geocode');
    Route::post('/nearby-places/search', [NearbyPlacesController::class, 'search'])->name('nearby-places.search');

    Route::middleware('role:super_admin,veterinarian,receptionist,customer,cashier,clinic_owner')->group(function () {
        Route::get('/pet-shop', [PetShopController::class, 'index'])->name('pet-shop.index');
    });

    Route::middleware('role:super_admin,cashier,receptionist,customer,clinic_owner')->group(function () {
        Route::post('/pet-shop/checkout', [PetShopController::class, 'checkout'])->name('pet-shop.checkout');
    });

    Route::middleware('role:super_admin,clinic_owner')->group(function () {
        Route::post('/pet-shop/{medicine}', [PetShopController::class, 'update'])->name('pet-shop.update');
    });

    Route::middleware('role:super_admin,cashier,receptionist,clinic_owner')->group(function () {
        Route::get('/pet-shop-billing', [PetShopBillingController::class, 'index'])->name('pet-shop-billing.index');
        Route::get('/pet-shop-billing/{billing}/receipt', [PetShopBillingController::class, 'receipt'])->name('pet-shop-billing.receipt');
        Route::put('/pet-shop-billing/{billing}', [PetShopBillingController::class, 'update'])->name('pet-shop-billing.update');
        Route::post('/pet-shop-billing/{billing}/payments', [PetShopBillingController::class, 'storePayment'])->name('pet-shop-billing.payments.store');
        Route::get('/pet-shop-reports', [PetShopReportController::class, 'index'])->name('pet-shop-reports.index');
    });

    Route::middleware('role:super_admin,clinic_owner')->group(function () {
        Route::delete('/pet-shop-billing/{billing}', [PetShopBillingController::class, 'destroy'])->name('pet-shop-billing.destroy');
    });

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
