<?php

use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\AppointmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BillingController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\GroomingRecordController;
use App\Http\Controllers\Api\V1\HealthRecordController;
use App\Http\Controllers\Api\V1\MedicineController;
use App\Http\Controllers\Api\V1\NearbyPlacesController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PetController;
use App\Http\Controllers\Api\V1\PetShopBillingController;
use App\Http\Controllers\Api\V1\PetShopController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ServiceCatalogController;
use App\Http\Controllers\Api\V1\VaccinationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Pet Information System — Mobile API (v1)
|--------------------------------------------------------------------------
|
| Full clinic mobile API. Authenticate via POST /api/v1/auth/login or
| /api/v1/auth/register, then send: Authorization: Bearer {token}
|
| Documentation: docs/MOBILE_API.md and docs/openapi.yaml
|
*/

Route::prefix('v1')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('register', [AuthController::class, 'register']);

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::get('user', [AuthController::class, 'user']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('dashboard', DashboardController::class);

        Route::middleware('api.role:super_admin,receptionist')->prefix('clients')->group(function (): void {
            Route::get('/', [ClientController::class, 'index']);
            Route::post('/', [ClientController::class, 'store']);
            Route::put('{client}', [ClientController::class, 'update']);
            Route::delete('{client}', [ClientController::class, 'destroy']);
        });

        Route::middleware('api.role:super_admin,veterinarian,receptionist,customer,cashier')->prefix('pets')->group(function (): void {
            Route::get('/', [PetController::class, 'index']);
            Route::get('{pet}', [PetController::class, 'show']);
            Route::get('{pet}/client-record', [PetController::class, 'clientRecord']);
        });

        Route::middleware('api.role:super_admin,veterinarian,receptionist,customer')->prefix('pets')->group(function (): void {
            Route::post('/', [PetController::class, 'store']);
            Route::post('{pet}', [PetController::class, 'update']); // POST for multipart photo uploads
            Route::put('{pet}', [PetController::class, 'update']);
            Route::delete('{pet}', [PetController::class, 'destroy']);
        });

        Route::middleware('api.role:super_admin,veterinarian,receptionist')->prefix('pets/{pet}/health-records')->group(function (): void {
            Route::post('/', [HealthRecordController::class, 'store']);
            Route::post('{healthRecord}', [HealthRecordController::class, 'update']);
            Route::put('{healthRecord}', [HealthRecordController::class, 'update']);
            Route::delete('{healthRecord}', [HealthRecordController::class, 'destroy']);
            Route::delete('{healthRecord}/sticker', [HealthRecordController::class, 'destroySticker']);
        });

        Route::middleware('api.role:super_admin,veterinarian,receptionist')->prefix('medicines')->group(function (): void {
            Route::get('/', [MedicineController::class, 'index']);
            Route::post('/', [MedicineController::class, 'store']);
            Route::put('{medicine}', [MedicineController::class, 'update']);
            Route::delete('{medicine}', [MedicineController::class, 'destroy']);
        });

        Route::middleware('api.role:super_admin,veterinarian,receptionist,cashier,customer')->prefix('appointments')->group(function (): void {
            Route::get('/', [AppointmentController::class, 'index']);
            Route::post('/', [AppointmentController::class, 'store']);
            Route::put('{appointment}', [AppointmentController::class, 'update']);
            Route::delete('{appointment}', [AppointmentController::class, 'destroy']);
        });

        Route::middleware('api.role:super_admin,veterinarian,receptionist,cashier')->prefix('vaccinations')->group(function (): void {
            Route::get('/', [VaccinationController::class, 'index']);
            Route::post('/', [VaccinationController::class, 'store']);
            Route::put('{vaccination}', [VaccinationController::class, 'update']);
            Route::delete('{vaccination}', [VaccinationController::class, 'destroy']);
        });

        Route::middleware('api.role:super_admin,groomer,receptionist,cashier,veterinarian')->get('grooming', [GroomingRecordController::class, 'index']);

        Route::middleware('api.role:super_admin,groomer,receptionist')->prefix('grooming')->group(function (): void {
            Route::post('/', [GroomingRecordController::class, 'store']);
            Route::put('{grooming}', [GroomingRecordController::class, 'update']);
            Route::delete('{grooming}', [GroomingRecordController::class, 'destroy']);
        });

        Route::middleware('api.role:super_admin,cashier,receptionist')->prefix('billing')->group(function (): void {
            Route::get('/', [BillingController::class, 'index']);
            Route::get('{billing}', [BillingController::class, 'show']);
            Route::get('{billing}/receipt', [BillingController::class, 'receipt']);
            Route::post('/', [BillingController::class, 'store']);
            Route::post('generate/{pet}', [BillingController::class, 'generateFromPet']);
            Route::put('{billing}', [BillingController::class, 'update']);
            Route::delete('{billing}', [BillingController::class, 'destroy']);
            Route::post('{billing}/payments', [BillingController::class, 'storePayment']);
        });

        Route::middleware('api.role:super_admin,veterinarian,receptionist,cashier,customer')->get('notifications', [NotificationController::class, 'index']);

        Route::middleware('api.role:super_admin,veterinarian,receptionist,cashier')->prefix('service-catalog')->group(function (): void {
            Route::get('/', [ServiceCatalogController::class, 'index']);
            Route::post('/', [ServiceCatalogController::class, 'store']);
            Route::put('{serviceCatalog}', [ServiceCatalogController::class, 'update']);
            Route::delete('{serviceCatalog}', [ServiceCatalogController::class, 'destroy']);
        });

        Route::middleware('api.role:super_admin,veterinarian,receptionist,cashier')->prefix('reports')->group(function (): void {
            Route::get('/', [ReportController::class, 'index']);
            Route::get('pets', [ReportController::class, 'pets']);
            Route::get('inventory', [ReportController::class, 'inventory']);
            Route::get('pets/export', [ReportController::class, 'exportPets']);
            Route::get('inventory/export', [ReportController::class, 'exportInventory']);
        });

        Route::middleware('api.role:super_admin')->prefix('admin/users')->group(function (): void {
            Route::get('/', [AdminUserController::class, 'index']);
            Route::post('/', [AdminUserController::class, 'store']);
            Route::put('{user}/role', [AdminUserController::class, 'updateRole']);
            Route::delete('{user}', [AdminUserController::class, 'destroy']);
        });

        Route::prefix('nearby-places')->group(function (): void {
            Route::get('/', [NearbyPlacesController::class, 'index']);
            Route::post('geocode', [NearbyPlacesController::class, 'geocode']);
            Route::post('search', [NearbyPlacesController::class, 'search']);
        });

        Route::middleware('api.role:super_admin,veterinarian,receptionist,customer,cashier')->get('pet-shop', [PetShopController::class, 'index']);

        Route::middleware('api.role:super_admin,cashier,receptionist,customer')->post('pet-shop/checkout', [PetShopController::class, 'checkout']);

        Route::middleware('api.role:super_admin')->post('pet-shop/{medicine}', [PetShopController::class, 'update']);

        Route::middleware('api.role:super_admin,cashier,receptionist')->prefix('pet-shop-billing')->group(function (): void {
            Route::get('/', [PetShopBillingController::class, 'index']);
            Route::put('{billing}', [PetShopBillingController::class, 'update']);
            Route::post('{billing}/payments', [PetShopBillingController::class, 'storePayment']);
            Route::delete('{billing}', [PetShopBillingController::class, 'destroy']);
        });

        Route::prefix('profile')->group(function (): void {
            Route::get('/', [ProfileController::class, 'show']);
            Route::patch('/', [ProfileController::class, 'update']);
            Route::put('password', [ProfileController::class, 'updatePassword']);
            Route::delete('/', [ProfileController::class, 'destroy']);
        });
    });
});
