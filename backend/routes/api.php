<?php

use App\Http\Controllers\Api\AttendanceScanController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\TrainingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PresenTrain High-Performance REST API Routes
|--------------------------------------------------------------------------
| Arsitektur rute API terstruktur, modular, dan bersih untuk:
| 1. Autentikasi & Google OAuth
| 2. Master Pelatihan & Sesi Publik
| 3. Pemindaian Presensi Kecepatan Tinggi (Scan & Offline Batch Sync)
| 4. User Profile & Sanctum Guarded Routes
*/

// =========================================================================
// 1. PUBLIC AUTHENTICATION & OAUTH ROUTES
// =========================================================================
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    
    // Google OAuth 2.0 Flow
    Route::get('/google', [GoogleAuthController::class, 'redirectToGoogle']);
    Route::get('/google/callback', [GoogleAuthController::class, 'handleGoogleCallback']);
    Route::post('/google/complete-registration', [GoogleAuthController::class, 'completeRegistration']);
    Route::post('/google/complete', [GoogleAuthController::class, 'completeRegistration']); // Alias support
});

// =========================================================================
// 2. PUBLIC TRAINING & SESSIONS
// =========================================================================
Route::get('/trainings', [TrainingController::class, 'index']);
Route::get('/trainings/{training}', [TrainingController::class, 'show']);
Route::get('/sessions/{session}/stats', [AttendanceScanController::class, 'sessionStats']);

// =========================================================================
// 3. ATTENDANCE SCAN & SYNCHRONIZATION (Dual alias: /attendance & /attendances)
// =========================================================================
Route::post('/attendance/scan', [AttendanceScanController::class, 'scan']);
Route::post('/attendances/scan', [AttendanceScanController::class, 'scan']);
Route::post('/attendance/sync-batch', [AttendanceScanController::class, 'batchSync']);
Route::post('/attendances/batch-sync', [AttendanceScanController::class, 'batchSync']);

// =========================================================================
// 4. USER PROFILE & SETTINGS
// =========================================================================
Route::post('/user/profile', [AuthController::class, 'updateProfile']);

// =========================================================================
// 5. PROTECTED USER ROUTES (SANCTUM)
// =========================================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    
    // Area Role: Admin Utama (Super Admin)
    Route::prefix('super-admin')->group(function () {
        // Reserved for super admin specific endpoints (e.g., audit log, full reset)
    });

    // Area Role: Administrator
    Route::prefix('admin')->group(function () {
        // Reserved for admin specific endpoints (e.g., manual override, session control)
    });

    // Area Role: Peserta
    Route::prefix('peserta')->group(function () {
        // Reserved for participant specific endpoints (e.g., my certificates)
    });
});
