<?php

use App\Http\Controllers\Api\AttendanceScanController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TrainingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PresenTrain High-Performance REST API Routes
|--------------------------------------------------------------------------
*/

// Public Auth Routes
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// Public Training & Sessions Info
Route::get('/trainings', [TrainingController::class, 'index']);
Route::get('/trainings/{training}', [TrainingController::class, 'show']);
Route::get('/sessions/{session}/stats', [AttendanceScanController::class, 'sessionStats']);

// High-Speed Attendance Scan Endpoint (Optimized for instant camera scan response)
Route::post('/attendances/scan', [AttendanceScanController::class, 'scan']);
Route::post('/attendances/batch-sync', [AttendanceScanController::class, 'batchSync']);

// User Profile & Avatar Update
Route::post('/user/profile', [AuthController::class, 'updateProfile']);

// Protected User Routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Current Authenticated User Info
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Admin Utama (Super Admin) Scope
    Route::prefix('super-admin')->middleware('role:super_admin')->group(function () {
        Route::get('/overview', [TrainingController::class, 'index']);
        // Future Super Admin endpoints automatically protected here
    });

    // Administrator (Panitia) Scope
    Route::prefix('admin')->middleware('role:admin,super_admin')->group(function () {
        Route::get('/sessions', [TrainingController::class, 'index']);
        // Future Administrator endpoints automatically protected here
    });

    // Peserta (Participant) Scope
    Route::prefix('participant')->middleware('role:participant,admin,super_admin')->group(function () {
        Route::get('/my-trainings', [TrainingController::class, 'index']);
        // Future Participant endpoints automatically protected here
    });
});

