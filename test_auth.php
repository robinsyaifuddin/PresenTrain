<?php
require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$accounts = [
    ['Email' => 'admin.utama@presentrain.com', 'Pass' => 'AdminUtama123!', 'ExpectedRole' => 'super_admin'],
    ['Email' => 'admin.panitia@presentrain.com', 'Pass' => 'AdminPanitia123!', 'ExpectedRole' => 'admin'],
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
