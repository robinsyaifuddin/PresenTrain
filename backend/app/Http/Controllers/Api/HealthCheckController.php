<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class HealthCheckController extends Controller
{
    /**
     * Memeriksa kesehatan server, database, dan penyimpanan file.
     * Mendukung tampilan visual Dashboard HTML jika dibuka lewat browser,
     * serta respons JSON murni jika diakses oleh API / UptimeRobot.
     */
    public function check(Request $request)
    {
        $startTime = microtime(true);
        $checks = [
            'database' => false,
            'storage'  => false,
            'cache'    => false,
        ];
        $errors = [];

        // 1. Cek Koneksi Database
        try {
            DB::connection()->getPdo();
            DB::select('SELECT 1');
            $checks['database'] = true;
        } catch (\Throwable $e) {
            $checks['database'] = false;
            $errors['database'] = 'Koneksi database gagal atau batas koneksi terlampaui: ' . $e->getMessage();
        }

        // 2. Cek Izin Tulis Direktori Storage & Cache
        try {
            $storagePath = storage_path('framework/cache');
            if (!File::isDirectory($storagePath)) {
                File::makeDirectory($storagePath, 0755, true, true);
            }
            $testFile = $storagePath . '/health_check_' . time() . '.tmp';
            File::put($testFile, 'ok');
            File::delete($testFile);
            $checks['storage'] = true;
        } catch (\Throwable $e) {
            $checks['storage'] = false;
            $errors['storage'] = 'Storage tidak dapat ditulis (permissions/disk penuh): ' . $e->getMessage();
        }

        // 3. Cek Sistem Cache
        try {
            cache()->put('health_check_ping', 'pong', 5);
            $cacheValue = cache()->get('health_check_ping');
            $checks['cache'] = ($cacheValue === 'pong');
        } catch (\Throwable $e) {
            $checks['cache'] = false;
            $errors['cache'] = 'Cache error: ' . $e->getMessage();
        }

        $responseTime = round((microtime(true) - $startTime) * 1000, 2);
        $isHealthy = $checks['database'] && $checks['storage'];
        $statusCode = $isHealthy ? 200 : 503;

        $payload = [
            'status'           => $isHealthy ? 'healthy' : 'unhealthy',
            'timestamp'        => now()->toIso8601String(),
            'response_time_ms' => $responseTime,
            'checks'           => $checks,
            'server'           => [
                'php_version'     => PHP_VERSION,
                'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            ],
        ];

        if (!empty($errors)) {
            $payload['errors'] = $errors;
        }

        // Jika diminta format JSON eksplisit atau dipanggil oleh request API murni
        $wantsJson = $request->query('format') === 'json' ||
                     ($request->wantsJson() && !str_contains($request->header('Accept', ''), 'text/html'));

        if ($wantsJson) {
            return response()->json($payload, $statusCode);
        }

        // Tampilkan Dashboard Visual HTML yang rapi & mudah dibaca di browser
        return response($this->renderHtmlDashboard($payload, $isHealthy), $statusCode)
            ->header('Content-Type', 'text/html; charset=utf-8');
    }

    /**
     * Render antarmuka visual status server yang modern dan responsif.
     */
    private function renderHtmlDashboard(array $data, bool $isHealthy): string
    {
        $statusBadgeBg = $isHealthy ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300';
        $statusDot = $isHealthy ? 'bg-emerald-500' : 'bg-rose-500';
        $statusTitle = $isHealthy ? 'Semua Sistem Berjalan Normal' : 'Gangguan Terdeteksi pada Server';
        $statusDesc = $isHealthy 
            ? 'Layanan PresenTrain, database MySQL, dan penyimpanan berkas beroperasi optimal.' 
            : 'Satu atau lebih komponen utama memerlukan pemeriksaan teknisi.';

        $dbStatus = $data['checks']['database'] 
            ? '<span class="text-emerald-700 font-bold flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Terhubung (MySQL Active)</span>'
            : '<span class="text-rose-600 font-bold flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg> Terputus</span>';

        $storageStatus = $data['checks']['storage']
            ? '<span class="text-emerald-700 font-bold flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Izin Tulis Aman (Writable)</span>'
            : '<span class="text-rose-600 font-bold flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg> Read-Only / Disk Penuh</span>';

        $cacheStatus = $data['checks']['cache']
            ? '<span class="text-emerald-700 font-bold flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Optimal (Responsive)</span>'
            : '<span class="text-amber-600 font-bold flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> Cache Warning</span>';

        $responseTime = $data['response_time_ms'] . ' ms';
        $phpVersion = $data['server']['php_version'];
        $memoryUsage = $data['server']['memory_usage_mb'] . ' MB';
        $timestamp = now()->timezone('Asia/Jakarta')->translatedFormat('d F Y, H:i:s') . ' WIB';

        $errorSection = '';
        if (!empty($data['errors'])) {
            $errorList = '';
            foreach ($data['errors'] as $key => $msg) {
                $errorList .= '<li class="text-rose-800 text-xs font-mono bg-rose-100/60 p-2 rounded border border-rose-200">' . htmlspecialchars($key . ': ' . $msg) . '</li>';
            }
            $errorSection = <<<HTML
            <div class="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <h4 class="text-xs font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    Detail Masalah:
                </h4>
                <ul class="space-y-1.5">{$errorList}</ul>
            </div>
HTML;
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PresenTrain &mdash; Status Kesehatan Sistem</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 antialiased selection:bg-emerald-500 selection:text-white">
    <div class="w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden transition-all">
        <!-- Header -->
        <div class="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg shadow-inner">
                    P
                </div>
                <div>
                    <h1 class="text-base font-extrabold tracking-tight">PresenTrain Health Monitor</h1>
                    <p class="text-xs text-slate-400 font-medium">Real-time Service & Server Diagnostics</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border {$statusBadgeBg}">
                    <span class="w-2 h-2 rounded-full {$statusDot} mr-1.5 animate-pulse"></span>
                    {$data['status']}
                </span>
            </div>
        </div>

        <!-- Status Banner -->
        <div class="p-6 border-b border-slate-100 bg-slate-50/50">
            <div class="flex items-start space-x-3.5">
                <div class="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0">
                    <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                </div>
                <div class="flex-1">
                    <h2 class="text-base font-bold text-slate-900">{$statusTitle}</h2>
                    <p class="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">{$statusDesc}</p>
                </div>
            </div>
            {$errorSection}
        </div>

        <!-- Detail Metrik -->
        <div class="p-6">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5">Komponen & Parameter Kinerja</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <!-- Database -->
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span class="font-semibold text-slate-600">Database MySQL</span>
                    {$dbStatus}
                </div>

                <!-- Storage -->
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span class="font-semibold text-slate-600">File Storage</span>
                    {$storageStatus}
                </div>

                <!-- Cache -->
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span class="font-semibold text-slate-600">Cache Driver</span>
                    {$cacheStatus}
                </div>

                <!-- Latency -->
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span class="font-semibold text-slate-600">Kecepatan Respons</span>
                    <span class="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">{$responseTime}</span>
                </div>

                <!-- PHP Version -->
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span class="font-semibold text-slate-600">Versi PHP Server</span>
                    <span class="font-mono font-bold text-slate-800">{$phpVersion}</span>
                </div>

                <!-- Memory Usage -->
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span class="font-semibold text-slate-600">Beban Memori PHP</span>
                    <span class="font-mono font-bold text-slate-800">{$memoryUsage}</span>
                </div>
            </div>

            <!-- Timestamp Bar -->
            <div class="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
                <div class="flex items-center gap-1.5 font-medium">
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Pengecekan terakhir: <span class="font-bold text-slate-700">{$timestamp}</span>
                </div>
                <div class="flex items-center gap-2">
                    <a href="?format=json" class="text-emerald-600 hover:text-emerald-700 font-bold hover:underline">Format JSON</a>
                    <span>&bull;</span>
                    <button onclick="window.location.reload()" class="text-slate-700 hover:text-slate-900 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                        Segarkan
                    </button>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>&copy; PresenTrain &bull; Hostinger Cloud</span>
            <a href="/" class="text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1">
                Buka Website
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
            </a>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
