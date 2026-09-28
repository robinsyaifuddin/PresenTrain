<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$accounts = [
    ['Email' => 'superadmin@presentraining.com', 'Pass' => 'admin123', 'ExpectedRole' => 'super_admin'],
    ['Email' => 'admin@presentrain.com', 'Pass' => 'admin123', 'ExpectedRole' => 'super_admin'],
    ['Email' => 'admin@presentraining.com', 'Pass' => 'admin123', 'ExpectedRole' => 'admin'],
    ['Email' => 'panitia@presentrain.com', 'Pass' => 'admin123', 'ExpectedRole' => 'admin'],
    ['Email' => 'peserta@presentraining.com', 'Pass' => 'peserta123', 'ExpectedRole' => 'participant'],
];

echo "=== HASIL VERIFIKASI AKUN LOGIN ===\n";
foreach ($accounts as $acc) {
    $u = User::where('email', $acc['Email'])->first();
    if (!$u) {
        echo "[GAGAL] User '{$acc['Email']}' TIDAK DITEMUKAN di database!\n";
        continue;
    }
    $validPass = Hash::check($acc['Pass'], $u->password);
    if ($validPass) {
        echo "[BERHASIL] {$acc['Email']} (Pass: {$acc['Pass']}) -> Role: {$u->role} | Nama: {$u->name}\n";
    } else {
        echo "[GAGAL PASSWORD] {$acc['Email']} password '{$acc['Pass']}' TIDAK COCOK!\n";
    }
}
