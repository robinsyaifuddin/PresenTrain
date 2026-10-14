<?php

use App\Http\Controllers\Api\AttendanceScanController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\HealthCheckController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\TrainingController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PresenTrain High-Performance REST API Routes
|--------------------------------------------------------------------------
| Arsitektur rute API terstruktur, modular, dan bersih untuk Shared Hosting:
| 1. Autentikasi & Google OAuth 2.0
| 2. Master Pelatihan & Sesi Publik
| 3. Pemindaian Presensi Kecepatan Tinggi (Scan, Batch Sync, & SSE Realtime Stream)
| 4. User Management, Settings, & Full CRUD Pelatihan
|--------------------------------------------------------------------------
*/

// =========================================================================
// 1. PUBLIC AUTHENTICATION & OAUTH ROUTES
// =========================================================================
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:60,1');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:40,1');
    Route::post('/forgot-password', [AuthController::class, 'sendResetOtp'])->middleware('throttle:15,1');
    Route::post('/send-otp', [AuthController::class, 'sendResetOtp'])->middleware('throttle:15,1');
    Route::post('/verify-otp', [AuthController::class, 'verifyResetOtp'])->middleware('throttle:30,1');
    Route::post('/reset-password', [AuthController::class, 'resetPasswordWithOtp'])->middleware('throttle:20,1');
    Route::post('/change-email/send-otp', [AuthController::class, 'sendChangeEmailOtp']);
    Route::post('/change-email/verify', [AuthController::class, 'verifyChangeEmailOtp']);
    
    // Google OAuth 2.0 Flow
    Route::get('/google', [GoogleAuthController::class, 'redirectToGoogle']);
    Route::get('/google/callback', [GoogleAuthController::class, 'handleGoogleCallback']);
    Route::post('/google/verify', [GoogleAuthController::class, 'verifyGoogleToken']);
    Route::post('/google/token', [GoogleAuthController::class, 'verifyGoogleToken']);
    Route::post('/google/complete-registration', [GoogleAuthController::class, 'completeRegistration']);
    Route::post('/google/complete', [GoogleAuthController::class, 'completeRegistration']);
});

// =========================================================================
// 2. PUBLIC TRAINING, SETTINGS & REALTIME ATTENDANCE STREAMING
// =========================================================================
Route::get('/trainings', [TrainingController::class, 'index']);
Route::get('/trainings/{training}', [TrainingController::class, 'show']);
Route::get('/sessions/{session}/stats', [AttendanceScanController::class, 'sessionStats']);
Route::get('/sessions/{session}/stream', [AttendanceScanController::class, 'streamSessionStats']); // SSE Realtime tanpa refresh
Route::get('/health', [HealthCheckController::class, 'check']);
Route::get('/settings', [SettingController::class, 'index']);
Route::get('/users', [UserController::class, 'index']);
Route::get('/users/{id}', [UserController::class, 'show']);
Route::post('/users', [UserController::class, 'store']);
Route::put('/users/{id}', [UserController::class, 'update']);
Route::delete('/users/{id}', [UserController::class, 'destroy']);

// =========================================================================
// 3. ATTENDANCE SCAN & SYNCHRONIZATION (Dual alias: /attendance & /attendances)
// =========================================================================
Route::post('/attendance/scan', [AttendanceScanController::class, 'scan'])->middleware('throttle:120,1');
Route::post('/attendances/scan', [AttendanceScanController::class, 'scan'])->middleware('throttle:120,1');
Route::post('/attendance/verify', [AttendanceScanController::class, 'scan'])->middleware('throttle:120,1');
Route::post('/attendance/sync-batch', [AttendanceScanController::class, 'batchSync'])->middleware('throttle:60,1');
Route::post('/attendances/batch-sync', [AttendanceScanController::class, 'batchSync'])->middleware('throttle:60,1');
Route::post('/sessions/{session}/activate-barcode', [AttendanceScanController::class, 'activateSessionBarcode']);
Route::post('/sessions/{session}/deactivate-barcode', [AttendanceScanController::class, 'deactivateSessionBarcode']);
Route::get('/users/{id}/attendances', [AttendanceScanController::class, 'getUserAttendances']);
Route::get('/user/attendances', [AttendanceScanController::class, 'getUserAttendances']);
Route::get('/attendances/user', [AttendanceScanController::class, 'getUserAttendances']);
Route::post('/attendances/status', [AttendanceScanController::class, 'setStatus']);
Route::post('/attendance/status', [AttendanceScanController::class, 'setStatus']);

// =========================================================================
// ASYNC TICKET POLLING (High Performance & Shared Hosting Friendly)
// Khusus Administrator dan Admin Utama: bypass rate limiting agar tidak kena limit saat memantau antrean!
// =========================================================================
Route::get('/queue/tickets/{id}', [\App\Http\Controllers\Api\AsyncTicketController::class, 'show'])->middleware('throttle:300,1');
Route::get('/async-jobs/{id}', [\App\Http\Controllers\Api\AsyncTicketController::class, 'show'])->middleware('throttle:300,1');

// =========================================================================
// 4. USER PROFILE
// =========================================================================
Route::post('/user/profile', [AuthController::class, 'updateProfile']);

// =========================================================================
// 5. PROTECTED API ROUTES (SANCTUM)
// =========================================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    
    // Site Settings Update
    Route::post('/settings', [SettingController::class, 'update']);

    // Management CRUD - Trainings & Sessions
    Route::post('/trainings', [TrainingController::class, 'store']);
    Route::put('/trainings/{id}', [TrainingController::class, 'update']);
    Route::delete('/trainings/{id}', [TrainingController::class, 'destroy']);
    Route::post('/trainings/{id}/sessions', [TrainingController::class, 'storeSession']);
    Route::put('/sessions/{id}', [TrainingController::class, 'updateSession']);
    Route::delete('/sessions/{id}', [TrainingController::class, 'destroySession']);

    // Classes & Class Admins Management
    Route::get('/classes', [\App\Http\Controllers\Api\ClassController::class, 'index']);
    Route::post('/classes', [\App\Http\Controllers\Api\ClassController::class, 'store']);
    Route::get('/classes/{id}', [\App\Http\Controllers\Api\ClassController::class, 'show']);
    Route::put('/classes/{id}', [\App\Http\Controllers\Api\ClassController::class, 'update']);
    Route::delete('/classes/{id}', [\App\Http\Controllers\Api\ClassController::class, 'destroy']);
    Route::put('/classes/{id}/admins', [\App\Http\Controllers\Api\ClassController::class, 'assignAdmins']);
    Route::put('/classes/admin-assignment/{adminId}', [\App\Http\Controllers\Api\ClassController::class, 'updateAdminClasses']);
    Route::post('/classes/{id}/participants', [\App\Http\Controllers\Api\ClassController::class, 'addParticipants']);
    Route::delete('/classes/{classId}/participants/{userId}', [\App\Http\Controllers\Api\ClassController::class, 'removeParticipant']);
    Route::get('/classes/{classId}/quiz-access', [\App\Http\Controllers\Api\ClassController::class, 'getQuizAccess']);
    Route::put('/classes/{classId}/quiz-access/{quizId}', [\App\Http\Controllers\Api\ClassController::class, 'toggleQuizAccess']);

    // Rekap Semua Data (Excel Format) & Audit Logs
    Route::get('/rekap/global-sheets', [\App\Http\Controllers\Api\RekapSheetController::class, 'getRekapData']);
    Route::post('/rekap/save-corrections', [\App\Http\Controllers\Api\RekapSheetController::class, 'saveCorrections']);
    Route::get('/rekap/audit-logs', [\App\Http\Controllers\Api\RekapSheetController::class, 'getAuditLogs']);
});

// =========================================================================
// 6. QUIZZES, ASSESSMENTS, & HELPDESK ROUTES
// =========================================================================
use App\Http\Controllers\QuizController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\QuizSubmissionController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\ViolationController;
use App\Http\Controllers\ContributionController;

// Quizzes CRUD
Route::get('/quizzes', [QuizController::class, 'index']);
Route::get('/quizzes/{id}', [QuizController::class, 'show']);
Route::post('/quizzes/{id}/start', [QuizController::class, 'start']);
Route::post('/quizzes/{id}/duplicate', [QuizController::class, 'duplicate']);
Route::post('/quizzes', [QuizController::class, 'store']);
Route::put('/quizzes/{id}', [QuizController::class, 'update']);
Route::delete('/quizzes/{id}', [QuizController::class, 'destroy']);

// Questions
Route::get('/quizzes/{quizId}/questions', [QuestionController::class, 'index']);
Route::post('/quizzes/{quizId}/questions', [QuestionController::class, 'store']);
Route::apiResource('questions', QuestionController::class);

// Quiz Submissions & Import/Revert
Route::get('/quizzes/{quizId}/submissions', [QuizSubmissionController::class, 'index']);
Route::post('/quizzes/{quizId}/submissions', [QuizSubmissionController::class, 'store']);
Route::post('/quizzes/{quizId}/import-scores', [QuizSubmissionController::class, 'importScores']);
Route::get('/quiz-submissions', [QuizSubmissionController::class, 'index']);
Route::post('/quiz-submissions', [QuizSubmissionController::class, 'store']);
Route::put('/quiz-submissions/{id}', [QuizSubmissionController::class, 'update']);
Route::post('/quiz-submissions/{id}/revert', [QuizSubmissionController::class, 'revertToOriginal']);
Route::delete('/quiz-submissions/{id}', [QuizSubmissionController::class, 'destroy']);

// Quiz Grade Requests
Route::get('/quiz-requests', [QuizSubmissionController::class, 'getGradeRequests']);
Route::post('/quiz-requests', [QuizSubmissionController::class, 'storeGradeRequest']);
Route::put('/quiz-requests/{id}', [QuizSubmissionController::class, 'updateGradeRequest']);
Route::delete('/quiz-requests/{id}', [QuizSubmissionController::class, 'destroyGradeRequest']);

// Assessments
Route::get('/assessments', [AssessmentController::class, 'index']);
Route::post('/assessments/batch-sync', [AssessmentController::class, 'store']);
Route::get('/assessments/{type}', [AssessmentController::class, 'index']);
Route::post('/assessments', [AssessmentController::class, 'store']);
Route::post('/assessments/{type}', [AssessmentController::class, 'store']);
Route::put('/assessments/{id}', [AssessmentController::class, 'update']);
Route::delete('/assessments/{id}', [AssessmentController::class, 'destroy']);

// Tickets / Helpdesk
Route::get('/tickets', [TicketController::class, 'index']);
Route::post('/tickets', [TicketController::class, 'store']);
Route::put('/tickets/{id}', [TicketController::class, 'update']);
Route::delete('/tickets/{id}', [TicketController::class, 'destroy']);

// Violations & Contributions
Route::apiResource('violations', ViolationController::class);
Route::apiResource('contributions', ContributionController::class);

// Administrative Activity & Audit Logs
Route::get('/audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);
Route::get('/audit-logs/{id}', [\App\Http\Controllers\Api\AuditLogController::class, 'show']);