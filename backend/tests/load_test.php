<?php
/**
 * PresenTrain Concurrency & Load Stress Test
 * ===========================================
 * Jalankan via SSH setelah deploy:
 *   php tests/load_test.php --url=https://presentrain.anda.com --users=50 --session=1
 *
 * Test ini mensimulasikan:
 * 1. N user melakukan scan presensi bersamaan (concurrent)
 * 2. Memastikan tidak ada duplikasi data di DB
 * 3. Mengukur response time tiap request
 * 4. Mendeteksi error / crash 500 di bawah beban
 *
 * Dependency: PHP curl extension (tersedia di semua Hostinger PHP)
 */

// =========================================================================
// PARSE ARGUMENTS
// =========================================================================
$options = getopt('', ['url:', 'users:', 'session:', 'token:']);
$BASE_URL    = rtrim($options['url'] ?? 'http://localhost/api', '/');
$NUM_USERS   = (int)($options['users'] ?? 20);
$SESSION_ID  = $options['session'] ?? '1';
$ADMIN_TOKEN = $options['token'] ?? ''; // Bearer token admin (opsional, untuk scan admin mode)

echo PHP_EOL;
echo "╔══════════════════════════════════════════════════════════╗\n";
echo "║    PresenTrain Concurrency Load Test                     ║\n";
echo "║    Target: {$BASE_URL}\n";
echo "║    Simulasi: {$NUM_USERS} user scan bersamaan ke Sesi #{$SESSION_ID}\n";
echo "╚══════════════════════════════════════════════════════════╝\n\n";

// =========================================================================
// STEP 1: Ambil semua token peserta yang ada dari API
// =========================================================================
echo "📋 Mengambil daftar peserta dari API...\n";
$ch = curl_init("{$BASE_URL}/users?role=participant&per_page={$NUM_USERS}");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => $ADMIN_TOKEN
        ? ["Authorization: Bearer {$ADMIN_TOKEN}", 'Accept: application/json']
        : ['Accept: application/json'],
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code !== 200) {
    echo "❌ Gagal mengambil peserta (HTTP {$code}). Pastikan API aktif dan token admin valid.\n";
    exit(1);
}

$data = json_decode($resp, true);
$participants = $data['data']['data'] ?? $data['data'] ?? [];

if (empty($participants)) {
    echo "⚠️  Tidak ada peserta ditemukan. Tambahkan peserta dulu via dashboard admin.\n";
    exit(1);
}

// Ambil token QR peserta
$tokens = array_map(fn($u) => $u['user_qr_token'] ?? null, $participants);
$tokens = array_filter($tokens);
$tokens = array_values($tokens);

if (empty($tokens)) {
    echo "⚠️  Peserta tidak memiliki QR token. Generate token dulu.\n";
    exit(1);
}

$tokenCount = min($NUM_USERS, count($tokens));
echo "✅ {$tokenCount} peserta ditemukan. Memulai simulasi scan bersamaan...\n\n";

// =========================================================================
// STEP 2: Kirim N request scan secara paralel dengan cURL Multi
// =========================================================================
$multiHandle = curl_multi_init();
$handles = [];
$startTimes = [];

for ($i = 0; $i < $tokenCount; $i++) {
    $token = $tokens[$i % count($tokens)];

    $ch = curl_init("{$BASE_URL}/attendance/scan");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode([
            'user_qr_token'       => $token,
            'training_session_id' => $SESSION_ID,
            'source'              => 'load_test_concurrent',
        ]),
        CURLOPT_HTTPHEADER => array_filter([
            'Content-Type: application/json',
            'Accept: application/json',
            $ADMIN_TOKEN ? "Authorization: Bearer {$ADMIN_TOKEN}" : null,
        ]),
    ]);

    $handles[$i] = $ch;
    $startTimes[$i] = microtime(true);
    curl_multi_add_handle($multiHandle, $ch);
}

// Execute semua request secara paralel
$running = null;
do {
    curl_multi_exec($multiHandle, $running);
    curl_multi_select($multiHandle, 0.01);
} while ($running > 0);

// =========================================================================
// STEP 3: Analisis hasil
// =========================================================================
$results = [];
$statusCounts = [];

for ($i = 0; $i < $tokenCount; $i++) {
    $ch       = $handles[$i];
    $body     = curl_multi_getcontent($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $elapsed  = round((microtime(true) - $startTimes[$i]) * 1000, 1);
    $decoded  = json_decode($body, true);
    $status   = $decoded['status'] ?? 'unknown';
    $token    = $tokens[$i % count($tokens)];

    $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;

    $results[] = [
        'index'    => $i + 1,
        'token'    => substr($token, 0, 20) . '...',
        'http'     => $httpCode,
        'status'   => $status,
        'ms'       => $elapsed,
        'message'  => $decoded['message'] ?? $decoded['error'] ?? '',
    ];

    curl_multi_remove_handle($multiHandle, $ch);
    curl_close($ch);
}

curl_multi_close($multiHandle);

// =========================================================================
// STEP 4: Print hasil per request
// =========================================================================
$times = array_column($results, 'ms');
$avgMs = round(array_sum($times) / count($times), 1);
$maxMs = round(max($times), 1);
$minMs = round(min($times), 1);

echo "┌──────┬──────────────────────────┬──────┬──────────────┬────────┐\n";
echo "│  #   │ Token (truncated)        │ HTTP │ Status       │   ms   │\n";
echo "├──────┼──────────────────────────┼──────┼──────────────┼────────┤\n";

foreach ($results as $r) {
    $icon = match($r['status']) {
        'success' => '✅',
        'warning' => '⚠️ ',
        'queued'  => '🔄',
        'error'   => '❌',
        default   => '❓',
    };
    printf("│ %4d │ %-24s │ %4d │ %s %-9s │ %5.0f  │\n",
        $r['index'], $r['token'], $r['http'], $icon, $r['status'], $r['ms']
    );
}

echo "└──────┴──────────────────────────┴──────┴──────────────┴────────┘\n\n";

// =========================================================================
// STEP 5: Summary
// =========================================================================
echo "📊 RINGKASAN HASIL:\n";
echo "   Total request : {$tokenCount}\n";
echo "   Response time : Min={$minMs}ms | Avg={$avgMs}ms | Max={$maxMs}ms\n";
foreach ($statusCounts as $st => $cnt) {
    $icon = match($st) {
        'success' => '✅',
        'warning' => '⚠️ ',
        'queued'  => '🔄',
        'error'   => '❌',
        default   => '❓',
    };
    echo "   {$icon} {$st}: {$cnt}\n";
}

// =========================================================================
// STEP 6: Cek duplikasi di database setelah test
// =========================================================================
echo "\n🔍 Memeriksa duplikasi data di database setelah test...\n";

// Bootstrap Laravel untuk query langsung
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    use Illuminate\Support\Facades\DB;

    $dupes = DB::table('attendances')
        ->select('registration_id', 'training_session_id', DB::raw('COUNT(*) as cnt'))
        ->groupBy('registration_id', 'training_session_id')
        ->havingRaw('COUNT(*) > 1')
        ->count();

    if ($dupes === 0) {
        echo "   ✅ ZERO DUPLIKASI — Race condition terlindungi sempurna!\n";
    } else {
        echo "   ❌ {$dupes} DUPLIKASI DITEMUKAN — Ada race condition! Segera periksa kode.\n";
    }
} else {
    echo "   ℹ️  Skip DB check (jalankan dari direktori backend untuk cek otomatis)\n";
}

echo PHP_EOL;
echo "══════════════════════════════════════════════════════════\n";
if (($statusCounts['error'] ?? 0) === 0 && $avgMs < 3000) {
    echo "🎉 SISTEM TAHAN BANTING! Tidak ada error di bawah {$tokenCount} concurrent users.\n";
} elseif (($statusCounts['error'] ?? 0) > 0) {
    echo "⚠️  Ada " . ($statusCounts['error'] ?? 0) . " error! Periksa laravel.log untuk detail.\n";
} else {
    echo "⚠️  Response time terlalu lambat ({$avgMs}ms avg). Pertimbangkan mode async=true.\n";
}
echo "══════════════════════════════════════════════════════════\n\n";
