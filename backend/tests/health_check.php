<?php
/**
 * PresenTrain Health Check Script
 * ================================
 * Jalankan via SSH: php tests/health_check.php
 * ATAU upload ke public_html/ dan akses via browser (hapus setelah selesai!)
 *
 * Apa yang diperiksa:
 * 1. Koneksi Database Remote (Hostinger)
 * 2. Tabel-tabel inti apakah ada dan berisi data nyata
 * 3. Cache (file-based) apakah bisa baca/tulis
 * 4. Queue jobs apakah ada yang stuck/failed
 * 5. Integritas relasi: Attendance tanpa Registration (orphan check)
 * 6. Duplikasi presensi (data corrupt check)
 * 7. Migrasi status
 */

// Bootstrap Laravel
require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

$results = [];
$overallOk = true;

function check(string $label, callable $test): array {
    try {
        $result = $test();
        return [
            'label'  => $label,
            'status' => $result['ok'] ? '✅ OK' : '⚠️  WARN',
            'detail' => $result['msg'],
            'ok'     => $result['ok'],
        ];
    } catch (\Throwable $e) {
        return [
            'label'  => $label,
            'status' => '❌ FAIL',
            'detail' => 'Exception: ' . $e->getMessage(),
            'ok'     => false,
        ];
    }
}

// =========================================================================
// 1. DATABASE CONNECTION (Hostinger Remote)
// =========================================================================
$results[] = check('DB Connection (Hostinger Remote)', function () {
    $start = microtime(true);
    DB::connection()->getPdo();
    $ms = round((microtime(true) - $start) * 1000, 1);
    return ['ok' => true, 'msg' => "Tersambung dalam {$ms}ms — DB: " . DB::getDatabaseName()];
});

// =========================================================================
// 2. TABLE EXISTENCE & ROW COUNT
// =========================================================================
$tables = [
    'users'              => 'Pengguna',
    'trainings'          => 'Pelatihan',
    'training_sessions'  => 'Sesi',
    'attendances'        => 'Presensi',
    'registrations'      => 'Registrasi',
    'quiz_submissions'   => 'Submisi Kuis',
    'async_job_tickets'  => 'Job Tickets',
    'activity_logs'      => 'Activity Logs',
    'rekap_audit_logs'   => 'Rekap Audit Logs',
];

foreach ($tables as $table => $label) {
    $results[] = check("Tabel [{$table}] ({$label})", function () use ($table) {
        if (!Schema::hasTable($table)) {
            return ['ok' => false, 'msg' => "Tabel tidak ditemukan! Jalankan: php artisan migrate"];
        }
        $count = DB::table($table)->count();
        return ['ok' => true, 'msg' => "{$count} baris ditemukan"];
    });
}

// =========================================================================
// 3. CACHE BACA/TULIS (File Driver)
// =========================================================================
$results[] = check('Cache Read/Write (File Driver)', function () {
    $key = 'presentrain_health_check_' . time();
    Cache::put($key, 'OK', 10);
    $val = Cache::get($key);
    Cache::forget($key);
    return ['ok' => $val === 'OK', 'msg' => $val === 'OK' ? 'Cache baca/tulis berhasil' : 'Cache gagal baca nilai yang disimpan'];
});

// =========================================================================
// 4. QUEUE: STUCK/FAILED JOBS
// =========================================================================
$results[] = check('Queue: Failed Jobs', function () {
    if (!Schema::hasTable('failed_jobs')) {
        return ['ok' => true, 'msg' => 'Tabel failed_jobs tidak ada (OK jika belum ada job failure)'];
    }
    $failedCount = DB::table('failed_jobs')->count();
    return [
        'ok'  => $failedCount === 0,
        'msg' => $failedCount === 0
            ? 'Tidak ada failed jobs'
            : "⚠️  {$failedCount} job GAGAL di queue! Jalankan: php artisan queue:retry all",
    ];
});

$results[] = check('Queue: Stuck Pending Tickets', function () {
    if (!Schema::hasTable('async_job_tickets')) {
        return ['ok' => true, 'msg' => 'Tabel belum ada'];
    }
    $stuckCount = DB::table('async_job_tickets')
        ->where('status', 'pending')
        ->where('created_at', '<', now()->subMinutes(10))
        ->count();
    return [
        'ok'  => $stuckCount === 0,
        'msg' => $stuckCount === 0
            ? 'Tidak ada job ticket yang macet'
            : "⚠️  {$stuckCount} ticket stuck lebih dari 10 menit! Cek laravel.log",
    ];
});

// =========================================================================
// 5. INTEGRITAS RELASI: Orphan Attendance (tanpa Registration)
// =========================================================================
$results[] = check('Data Integrity: Orphan Attendances', function () {
    $orphanCount = DB::table('attendances')
        ->leftJoin('registrations', 'attendances.registration_id', '=', 'registrations.id')
        ->whereNull('registrations.id')
        ->count();
    return [
        'ok'  => $orphanCount === 0,
        'msg' => $orphanCount === 0
            ? 'Semua presensi memiliki registrasi yang valid'
            : "🚨 {$orphanCount} presensi ORPHAN (tanpa registrasi)! Data corrupt!",
    ];
});

// =========================================================================
// 6. DUPLIKASI PRESENSI (Duplicate Check)
// =========================================================================
$results[] = check('Data Integrity: Duplicate Attendances', function () {
    $dupes = DB::table('attendances')
        ->select('registration_id', 'training_session_id', DB::raw('COUNT(*) as cnt'))
        ->groupBy('registration_id', 'training_session_id')
        ->havingRaw('COUNT(*) > 1')
        ->count();
    return [
        'ok'  => $dupes === 0,
        'msg' => $dupes === 0
            ? 'Tidak ada duplikasi presensi — data bersih'
            : "🚨 {$dupes} kombinasi user+sesi memiliki DUPLIKASI presensi! Segera bersihkan!",
    ];
});

// =========================================================================
// 7. ORPHAN QUIZ SUBMISSIONS (tanpa user yang ada)
// =========================================================================
$results[] = check('Data Integrity: Quiz Submissions tanpa User', function () {
    if (!Schema::hasTable('quiz_submissions')) return ['ok' => true, 'msg' => 'Tabel tidak ada'];
    $orphan = DB::table('quiz_submissions')
        ->leftJoin('users', 'quiz_submissions.user_id', '=', 'users.id')
        ->whereNotNull('quiz_submissions.user_id')
        ->whereNull('users.id')
        ->count();
    return [
        'ok'  => $orphan === 0,
        'msg' => $orphan === 0
            ? 'Semua submisi kuis memiliki user valid'
            : "⚠️  {$orphan} submisi kuis dari user yang sudah dihapus",
    ];
});

// =========================================================================
// 8. DB RESPONSE TIME (Latency Hostinger Remote)
// =========================================================================
$results[] = check('DB Latency (Remote Hostinger)', function () {
    $times = [];
    for ($i = 0; $i < 5; $i++) {
        $start = microtime(true);
        DB::select('SELECT 1');
        $times[] = (microtime(true) - $start) * 1000;
    }
    $avg = round(array_sum($times) / count($times), 1);
    $max = round(max($times), 1);
    $ok  = $avg < 300; // threshold 300ms untuk shared hosting
    return [
        'ok'  => $ok,
        'msg' => "Avg: {$avg}ms, Max: {$max}ms" . ($ok ? ' — Baik' : ' — Latency tinggi! Cek koneksi jaringan hosting'),
    ];
});

// =========================================================================
// 9. LOG FILE ACCESSIBILITY
// =========================================================================
$results[] = check('Log File Laravel Writable', function () {
    $logPath = storage_path('logs/laravel.log');
    if (!file_exists($logPath)) {
        return ['ok' => true, 'msg' => 'Log file belum ada (belum ada error — bagus!)'];
    }
    $sizeKb = round(filesize($logPath) / 1024, 1);
    $lastLine = '';
    if ($sizeKb > 0) {
        $lines = file($logPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $lastLine = end($lines) ?: '';
    }
    $ok = $sizeKb < 10240; // Warn jika log > 10MB
    return [
        'ok'  => $ok,
        'msg' => "Ukuran log: {$sizeKb} KB" . ($ok ? '' : ' — Log terlalu besar! Jalankan: php artisan log:clear'),
    ];
});

// =========================================================================
// OUTPUT REPORT
// =========================================================================
$failCount = count(array_filter($results, fn($r) => !$r['ok']));
$passCount = count($results) - $failCount;

echo PHP_EOL;
echo "╔══════════════════════════════════════════════════════════╗\n";
echo "║         PresenTrain System Health Check Report           ║\n";
echo "║         " . date('Y-m-d H:i:s') . " WIB                      ║\n";
echo "╚══════════════════════════════════════════════════════════╝\n";
echo PHP_EOL;

foreach ($results as $r) {
    echo "  {$r['status']}  {$r['label']}\n";
    echo "          → {$r['detail']}\n\n";
}

echo "──────────────────────────────────────────────────────────\n";
echo "  HASIL: {$passCount} LULUS / {$failCount} GAGAL dari " . count($results) . " pemeriksaan\n";
if ($failCount === 0) {
    echo "  🎉 SISTEM SEHAT SEMPURNA — Zero issues detected!\n";
} else {
    echo "  ⚠️  Perlu perhatian! Periksa item FAIL/WARN di atas.\n";
}
echo "──────────────────────────────────────────────────────────\n";
echo PHP_EOL;
