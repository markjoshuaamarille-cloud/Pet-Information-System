<?php
use App\Http\Controllers\PetController;
use Illuminate\Support\Facades\Route;

Route::apiResource('pets', PetController::class);
