<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Registration;
use App\Models\TrainingSession;
use App\Models\User;
use App\Models\AsyncJobTicket;
use App\Jobs\ProcessAttendanceQueueJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AttendanceScanController extends Controller
{
    /**
     * Resolve TrainingSession by numeric id, code, or fallback
     */
    protected function resolveSession($rawSession)
    {
        if (empty($rawSession)) {
            return null;
        }
        if (is_numeric($rawSession)) {
            $found = TrainingSession::find((int) $rawSession);
            if ($found) return $found;
        }
        $byCode = TrainingSession::where('session_code', $rawSession)->first();
        if ($byCode) return $byCode;

        $cleanCode = strtoupper(trim((string) $rawSession));
        $byUpper = TrainingSession::whereRaw('UPPER(session_code) = ?', [$cleanCode])->first();
        if ($byUpper) return $byUpper;

        if (preg_match('/(?:SES|SESI)[-_ ]*(\d+)/i', (string) $rawSession, $m)) {
            $num = (int) $m[1];
            $byNum = TrainingSession::find($num);
            if ($byNum) return $byNum;
            $padded = 'SES-' . str_pad($num, 2, '0', STR_PAD_LEFT);
            $byPadded = TrainingSession::where('session_code', $padded)->first();
            if ($byPadded) return $byPadded;
        }

        $digits = (int) preg_replace('/\D/', '', (string) $rawSession);
        if ($digits > 0) {
            $byDigit = TrainingSession::find($digits);
            if ($byDigit) return $byDigit;
            $paddedCode = 'SES-' . str_pad($digits, 2, '0', STR_PAD_LEFT);
            $byPadded = TrainingSession::where('session_code', $paddedCode)->first();
            if ($byPadded) return $byPadded;
        }

        return null;
    }

    /**
     * Ultra-fast single QR scan endpoint with atomic concurrency protection.
     * Supports:
     * 1. Admin scanning Participant Barcode (Token = ABSEN-PESERTA-...)
     * 2. Participant scanning Session Barcode with time-window limit (Token = ABSEN-SESI-...)
     * 3. Manual Token Input from Admin Session Action Menu
     */
    public function scan(Request $request)
    {
        $token = trim($request->input('user_qr_token') ?? $request->input('token') ?? $request->input('qrCode') ?? $request->input('session_token') ?? '');
        $rawSession = $request->input('training_session_id') ?? $request->input('sessionId') ?? null;
        $source = $request->input('source') ?? 'camera_scan';

        if (empty($token)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Token QR atau Kode Presensi wajib diisi!',
            ], 422);
        }

        // =========================================================================
        // SCENARIO A: Participant Scans Session Barcode (Token contains ABSEN-SESI-)
        // =========================================================================
        if (str_starts_with($token, 'ABSEN-SESI-') || str_contains($token, 'ABSEN-SESI-')) {
            $source = 'peserta_scan';

            // 1. Resolve Session from token or database
            $session = TrainingSession::where('barcode_token', $token)->first();

            if (!$session) {
                // Try resolving via SES-(\d+) in token (e.g. ABSEN-SESI-2-SES-02-EXP...)
                if (preg_match('/SES-(\d+)/i', $token, $m)) {
                    $session = $this->resolveSession('SES-' . str_pad($m[1], 2, '0', STR_PAD_LEFT));
                }
                // Try resolving via ABSEN-SESI-{index}-{sessionId}-EXP
                if (!$session && preg_match('/ABSEN-SESI-(\d+)-([^-]+)-EXP/i', $token, $m)) {
                    $session = $this->resolveSession($m[2]);
                    if (!$session) {
                        $session = $this->resolveSession($m[1]);
                    }
                }
                // Try resolving via ABSEN-SESI-{index}
                if (!$session && preg_match('/ABSEN-SESI-(\d+)/i', $token, $m)) {
                    $session = $this->resolveSession($m[1]);
                }
                // Try resolving via explicit request parameter if provided
                if (!$session && $rawSession) {
                    $session = $this->resolveSession($rawSession);
                }
            }

            if (!$session) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Sesi pelatihan dari Barcode ini tidak ditemukan dalam sistem!',
                ], 404);
            }

            // Sinkronisasi status sesi secara dinamis jika berbasis waktu
            $session->syncDynamicStatus();

            // 2. Validate Active Barcode Generation by Admin
            // Sesi WAJIB memiliki barcode_token yang aktif dan belum expired (hanya bisa scan jika admin telah membuat/mengaktifkan barcode)
            $isBarcodeActive = $session->barcode_token && $session->barcode_expires_at && now()->isBefore($session->barcode_expires_at);

            if (!$isBarcodeActive) {
                if ($session->barcode_expires_at && now()->isAfter($session->barcode_expires_at)) {
                    return response()->json([
                        'status'  => 'warning',
                        'title'   => 'BARCODE KEDALUWARSA!',
                        'message' => 'Masa berlaku Barcode Sesi ini telah habis. Silakan hubungi panitia untuk memperpanjang durasi absensi.',
                    ], 422);
                }

                return response()->json([
                    'status'  => 'warning',
                    'title'   => 'PRESENSI BELUM DIAKTIFKAN OLEH PANITIA',
                    'message' => "Presensi untuk '{$session->title}' belum dibuka. Silakan tunggu Administrator/Panitia mengaktifkan barcode sesi di layar.",
                ], 422);
            }

            // Validasi kecocokan token: Jika admin mengaktifkan token unik, token yang discan harus cocok dengan token aktif sesi di database
            if ($session->barcode_token && $token !== $session->barcode_token) {
                // Beri toleransi hanya jika token mengandung prefix dan ID sesi yang sama serta masa berlaku belum habis
                if (!str_contains($token, (string) $session->id) && !str_contains($session->barcode_token, $token)) {
                    return response()->json([
                        'status'  => 'error',
                        'title'   => 'BARCODE TIDAK COCOK',
                        'message' => 'Barcode sesi yang Anda scan tidak cocok atau telah diperbarui oleh panitia. Silakan scan barcode terbaru di layar.',
                    ], 422);
                }
            }

            // Also check embedded timestamp if available in token
            preg_match('/EXP(\d+)/', $token, $expMatches);
            if (!empty($expMatches[1])) {
                $expMs = (float) $expMatches[1];
                if ((microtime(true) * 1000) > $expMs) {
                    return response()->json([
                        'status'  => 'warning',
                        'title'   => 'BARCODE KEDALUWARSA!',
                        'message' => 'Waktu tayang Barcode Sesi telah berakhir. Silakan minta panitia menampilkan kembali barcode sesi.',
                    ], 422);
                }
            }

            // 3. Resolve Participant (from sanctum auth or request payload)
            $user = auth()->user();
            if (!$user && $request->input('userId')) {
                $user = User::find($request->input('userId'));
            }
            if (!$user && $request->input('user_id')) {
                $user = User::find($request->input('user_id'));
            }
            if (!$user && $request->input('user_qr_token')) {
                $user = User::where('user_qr_token', $request->input('user_qr_token'))->first();
            }
            if (!$user && $request->input('email')) {
                $user = User::where('email', $request->input('email'))->first();
            }

            if (!$user) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Akun peserta tidak teridentifikasi. Pastikan Anda telah login sebelum melakukan scan.',
                ], 401);
            }

            // Pastikan akun bertipe peserta (bukan admin yang iseng scan barcode sesi sendiri)
            if ($user->role !== 'peserta' && $user->role !== 'user') {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Hanya akun Peserta Pelatihan yang dapat melakukan presensi mandiri pada Barcode Sesi.',
                ], 403);
            }

        } else {
            // =========================================================================
            // SCENARIO B: Admin Scans Participant Barcode / Manual Participant Token Input
            // =========================================================================
            // 1. Direct match on user_qr_token
            $user = User::select('id', 'name', 'email', 'instansi', 'user_qr_token', 'role')
                ->where('user_qr_token', $token)
                ->first();

            // 2. If token is numeric (e.g. 298692), also search if any user's token ends with this number (for backward compatibility with old ABSEN-PESERTA-*-298692)
            if (!$user && is_numeric($token)) {
                $user = User::select('id', 'name', 'email', 'instansi', 'user_qr_token', 'role')
                    ->where('user_qr_token', 'LIKE', "%-{$token}")
                    ->first();
            }

            // 3. Fallback to user ID if numeric
            if (!$user && is_numeric($token)) {
                $user = User::select('id', 'name', 'email', 'instansi', 'user_qr_token', 'role')->find((int) $token);
            }

            // 4. Case-insensitive lookup or if scanned with prefix
            if (!$user) {
                // If token contains prefix like ABSEN-PESERTA-..., also try extracting trailing numbers
                if (preg_match('/(\d{4,})$/', $token, $matches)) {
                    $user = User::select('id', 'name', 'email', 'instansi', 'user_qr_token', 'role')
                        ->where('user_qr_token', $matches[1])
                        ->first();
                }

                if (!$user) {
                    $user = User::select('id', 'name', 'email', 'instansi', 'user_qr_token', 'role')
                        ->whereRaw('LOWER(user_qr_token) = ?', [strtolower($token)])->first();
                }
            }

            if (!$user) {
                return response()->json([
                    'status'  => 'error',
                    'message' => "Token QR ({$token}) tidak terdaftar dalam database peserta!",
                ], 404);
            }

            $session = $this->resolveSession($rawSession);

            if (!$session) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Sesi pelatihan tidak ditemukan atau belum dipilih! Administrator wajib memilih sesi presensi aktif terlebih dahulu.',
                ], 422);
            }

            // Sinkronisasi status dinamis sesi
            $session->syncDynamicStatus();

            // RULE: Presensi hanya bisa diisi pada sesi "Berlangsung" (kecuali jika barcode sesi sedang aktif atau super_admin)
            $isBarcodeActive = $session->barcode_expires_at && now()->isBefore($session->barcode_expires_at);
            if ($session->status !== 'Berlangsung' && !$isBarcodeActive && !(auth()->user() && auth()->user()->role === 'super_admin')) {
                return response()->json([
                    'status'  => 'error',
                    'message' => "Presensi hanya dapat dilakukan pada sesi yang berstatus 'Berlangsung'! Status sesi saat ini: '{$session->status}'.",
                ], 422);
            }

            // RULE: Administrator hanya bisa scan peserta dari kelas yang dipegangnya
            $currentUser = auth()->user();
            if ($currentUser && $currentUser->role === 'admin') {
                $accessibleClassIds = $currentUser->managedClasses()->pluck('classes.id')->all();
                if ($user->class_id === null || !in_array($user->class_id, $accessibleClassIds)) {
                    $className = $user->classRoom ? $user->classRoom->name : 'Kelas Umum';
                    return response()->json([
                        'status'  => 'error',
                        'message' => "Peserta ({$user->name}) terdaftar di {$className}, bukan di kelas yang Anda kelola!",
                    ], 403);
                }
            }
        }

        $sessionId = $session->id;

        // =========================================================================
        // ASYNC QUEUE MODE (High Concurrency / Shared Hosting Protection)
        // Jika client mengirim queue=true atau async=true, langsung jadwalkan via Queue & beri Tiket
        // =========================================================================
        if ($request->boolean('async') || $request->boolean('queue')) {
            $ticket = AsyncJobTicket::create([
                'user_id' => $user->id,
                'action_type' => 'attendance',
                'status' => 'pending',
                'progress_percent' => 10,
                'message' => 'Presensi Anda telah masuk dalam antrean server...',
                'payload' => [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'session_id' => $sessionId,
                    'session_title' => $session->title,
                    'source' => $source,
                ],
            ]);

            $scannerId = auth()->id() ?? $request->input('scanner_id') ?? 1;

            ProcessAttendanceQueueJob::dispatch($ticket->id, [
                'user_id' => $user->id,
                'session_id' => $sessionId,
                'scanned_by' => $scannerId,
                'source' => $source,
                'status' => $request->input('status', 'present'),
                'note' => $request->input('note'),
            ]);

            return response()->json([
                'status' => 'queued',
                'message' => 'Presensi berhasil masuk antrean server dan sedang diproses.',
                'ticket_id' => $ticket->id,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                ],
                'session' => [
                    'id' => $session->id,
                    'title' => $session->title,
                ],
            ], 202);
        }

        $scannerId = auth()->id() ?? $request->input('scanner_id') ?? 1;

        // =========================================================================
        // ATOMIC TRANSACTION: Auto-Register + Duplicate-safe Attendance Save
        // Wrapped in DB::transaction() dengan lockForUpdate() untuk mencegah race condition
        // jika 2+ request datang bersamaan untuk user + session yang sama (concurrent scan)
        // =========================================================================
        try {
            $result = DB::transaction(function () use ($user, $session, $sessionId, $scannerId, $source) {
                // firstOrCreate = atomic + safe: tidak akan duplicate Registration jika 2 request bersamaan
                $registration = Registration::firstOrCreate(
                    [
                        'user_id'     => $user->id,
                        'training_id' => $session->training_id,
                    ],
                    [
                        'status'        => 'active',
                        'registered_at' => now(),
                    ]
                );

                $scannedTime = now();

                // lockForUpdate: row-level lock mencegah 2 request membaca "null" bersamaan lalu sama-sama insert
                $existing = Attendance::where('registration_id', $registration->id)
                    ->where('training_session_id', $sessionId)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    return ['type' => 'existing', 'attendance' => $existing, 'scanned_time' => $scannedTime];
                }

                $attendance = Attendance::create([
                    'registration_id'     => $registration->id,
                    'training_session_id' => $sessionId,
                    'scanned_by'          => $scannerId,
                    'scanned_at'          => $scannedTime,
                    'status'              => 'present',
                    'source'              => $source,
                ]);

                return ['type' => 'created', 'attendance' => $attendance, 'scanned_time' => $scannedTime];
            });
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan presensi: ' . $e->getMessage(),
            ], 500);
        }

        Cache::forget('sess_stats_' . $sessionId);

        $existing    = $result['attendance'];
        $scannedTime = $result['scanned_time'];

        // Handle existing attendance
        if ($result['type'] === 'existing') {
            if ($existing->status === 'present') {
                $scannedAtFormatted = Carbon::parse($existing->scanned_at)->format('H:i') . ' WIB';
                $diffSeconds = $existing->scanned_at ? abs(Carbon::parse($existing->scanned_at)->diffInSeconds(now())) : 999;

                // Toleransi frame kamera berulang dalam 20 detik pertama: tetap respon SUKSES
                if ($diffSeconds <= 20) {
                    return response()->json([
                        'status'     => 'success',
                        'title'      => 'ABSENSI BERHASIL!',
                        'message'    => "Terverifikasi! {$user->name} berhasil melakukan presensi pada {$session->title}.",
                        'user'       => $user,
                        'session'    => $session,
                        'scanned_at' => $scannedAtFormatted,
                    ], 200);
                }

                return response()->json([
                    'status'     => 'warning',
                    'title'      => 'SUDAH ABSEN SEBELUMNYA!',
                    'message'    => "Peserta {$user->name} sudah tercatat hadir sebelumnya pada {$scannedAtFormatted}.",
                    'user'       => $user,
                    'session'    => $session,
                    'scanned_at' => $scannedAtFormatted,
                ], 200);
            } else {
                // If previously 'absent' or 'permission', update to 'present' because participant is now present & scanning
                $previousLabel = $existing->status === 'permission' ? 'Izin' : 'Tidak Hadir/Alfa';
                $existing->update([
                    'status'     => 'present',
                    'scanned_at' => $scannedTime,
                    'scanned_by' => $scannerId,
                    'source'     => $source,
                    'note'       => "Hadir via scan (sebelumnya {$previousLabel})",
                ]);

                $scannedAtFormatted = $scannedTime->format('H:i') . ' WIB';

                return response()->json([
                    'status'     => 'success',
                    'title'      => 'ABSENSI BERHASIL DIPERBARUI!',
                    'message'    => "Status {$user->name} berhasil diubah dari {$previousLabel} menjadi Hadir pada {$session->title}.",
                    'user'       => $user,
                    'session'    => $session,
                    'scanned_at' => $scannedAtFormatted,
                ], 200);
            }
        }

        // New attendance created
        $scannedAtFormatted = $scannedTime->format('H:i') . ' WIB';

        return response()->json([
            'status'     => 'success',
            'title'      => 'ABSENSI BERHASIL!',
            'message'    => "Terverifikasi! {$user->name} berhasil melakukan presensi pada {$session->title}.",
            'user'       => $user,
            'session'    => $session,
            'scanned_at' => $scannedAtFormatted,
        ], 200);
    }

    /**
     * Activate Dynamic Session Barcode with Duration.
     */
    public function activateSessionBarcode(Request $request, $sessionId)
    {
        $session = $this->resolveSession($sessionId);
        if (!$session) {
            return response()->json(['status' => 'error', 'message' => 'Sesi pelatihan tidak ditemukan'], 404);
        }

        $durationMinutes = (int) ($request->input('duration_minutes') ?? $request->input('durationMinutes') ?? 15);
        $token = $request->input('session_token') ?? $request->input('token');
        $expiresAt = now()->addMinutes($durationMinutes);

        $session->update([
            'barcode_token'      => $token,
            'barcode_expires_at' => $expiresAt,
            'status'             => 'Berlangsung',
        ]);

        \App\Services\AuditLogger::log(
            action: 'OPEN_SESSION',
            module: 'Presensi',
            description: "Membuka presensi barcode untuk sesi: {$session->title} (durasi: {$durationMinutes} menit)",
            status: 'SUCCESS',
            properties: [
                'session_id' => $session->id,
                'session_title' => $session->title,
                'duration_minutes' => $durationMinutes,
                'expires_at' => $expiresAt->toIso8601String()
            ]
        );

        return response()->json([
            'status'             => 'success',
            'message'            => "Barcode Sesi {$session->title} berhasil diaktifkan selama {$durationMinutes} menit!",
            'session_id'         => $session->id,
            'barcode_token'      => $session->barcode_token,
            'barcode_expires_at' => $session->barcode_expires_at->toIso8601String(),
            'expires_at_human'   => $session->barcode_expires_at->format('H:i') . ' WIB',
        ], 200);
    }

    /**
     * Deactivate Session Barcode.
     */
    public function deactivateSessionBarcode(Request $request, $sessionId)
    {
        $session = $this->resolveSession($sessionId);
        if (!$session) {
            return response()->json(['status' => 'error', 'message' => 'Sesi pelatihan tidak ditemukan'], 404);
        }

        $session->update([
            'barcode_token'      => null,
            'barcode_expires_at' => null,
        ]);

        \App\Services\AuditLogger::log(
            action: 'CLOSE_SESSION',
            module: 'Presensi',
            description: "Menutup presensi barcode untuk sesi: {$session->title}",
            status: 'SUCCESS',
            properties: [
                'session_id' => $session->id,
                'session_title' => $session->title,
            ]
        );

        return response()->json([
            'status'  => 'success',
            'message' => "Barcode Sesi {$session->title} dinonaktifkan.",
        ], 200);
    }

    /**
     * Get Attendances for a specific participant.
     */
    public function getUserAttendances(Request $request, $userId = null)
    {
        $user = null;
        if ($userId) {
            $user = User::find($userId);
        }
        if (!$user) {
            $user = auth()->user();
        }
        if (!$user && $request->input('email')) {
            $user = User::where('email', $request->input('email'))->first();
        }
        if (!$user && $request->input('user_qr_token')) {
            $user = User::where('user_qr_token', $request->input('user_qr_token'))->first();
        }

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Pengguna tidak ditemukan'], 404);
        }

        $user->load(['registrations.attendances.session', 'registrations.training.sessions']);
        $attMap = [];
        $recordedSessionIds = [];

        foreach ($user->registrations as $reg) {
            foreach ($reg->attendances as $att) {
                $sess = $att->session;
                $recordedSessionIds[] = (int) $att->training_session_id;
                $code = $sess ? ($sess->session_code ?: 'SES-' . $sess->id) : ('SES-' . $att->training_session_id);
                $timeFmt = $att->scanned_at ? Carbon::parse($att->scanned_at)->format('H:i') . ' WIB' : '-';
                $statusLabel = match($att->status) {
                    'present'    => 'Hadir',
                    'permission' => 'Izin',
                    'absent'     => 'Tidak Hadir',
                    default      => $att->status ?? 'Hadir',
                };
                $data = [
                    'present'             => $att->status === 'present',
                    'status'              => $statusLabel,
                    'raw_status'          => $att->status,
                    'note'                => $att->note,
                    'time'                => $timeFmt,
                    'timestamp'           => $att->scanned_at ? $att->scanned_at->toISOString() : null,
                    'source'              => $att->source,
                    'training_session_id' => $att->training_session_id,
                ];
                $attMap[$code] = $data;
                $attMap['SES-' . $att->training_session_id] = $data;
                $attMap[$att->training_session_id] = $data;
                $padded = 'SES-' . str_pad($att->training_session_id, 2, '0', STR_PAD_LEFT);
                $attMap[$padded] = $data;
            }

            // Cek setiap sesi pada training peserta: jika sesi sudah lewat (Selesai/is_passed) dan belum ada presensi, otomatis status Alfa (Tidak Hadir)
            if ($reg->training && $reg->training->sessions) {
                foreach ($reg->training->sessions as $trainingSess) {
                    if (!in_array((int)$trainingSess->id, $recordedSessionIds) && $trainingSess->is_passed) {
                        $code = $trainingSess->session_code ?: 'SES-' . $trainingSess->id;
                        $autoAbsent = [
                            'present'             => false,
                            'status'              => 'Tidak Hadir',
                            'raw_status'          => 'absent',
                            'note'                => 'Tidak Hadir / Alpa (Sesi telah berakhir)',
                            'time'                => '-',
                            'timestamp'           => null,
                            'source'              => 'auto_expired',
                            'training_session_id' => $trainingSess->id,
                        ];
                        $attMap[$code] = $autoAbsent;
                        $attMap['SES-' . $trainingSess->id] = $autoAbsent;
                        $attMap[$trainingSess->id] = $autoAbsent;
                        $padded = 'SES-' . str_pad($trainingSess->id, 2, '0', STR_PAD_LEFT);
                        $attMap[$padded] = $autoAbsent;
                    }
                }
            }
        }

        return response()->json([
            'status'      => 'success',
            'user_id'     => $user->id,
            'attendances' => $attMap,
        ], 200);
    }

    /**
     * Manually update attendance status for a participant in a session.
     * Supports:
     * - Status: 'present' / 'Hadir'
     * - Status: 'permission' / 'Izin' (with note / excuse reason)
     * - Status: 'absent' / 'Tidak Hadir'
     * - Status: 'reset' / 'Belum' (deletes attendance or resets)
     */
    public function setStatus(Request $request)
    {
        $userId = $request->input('user_id') ?? $request->input('participant_id') ?? $request->input('userId');
        $rawSession = $request->input('training_session_id') ?? $request->input('session_id') ?? $request->input('sessionId');
        $rawStatus = strtolower(trim((string) ($request->input('status', 'present'))));
        $note = $request->input('note') ?? $request->input('reason') ?? null;
        $source = $request->input('source', 'manual_admin');

        if (!$userId) {
            return response()->json(['status' => 'error', 'message' => 'Peserta (user_id) wajib dipilih!'], 422);
        }

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Peserta tidak ditemukan!'], 404);
        }

        $session = $this->resolveSession($rawSession);
        if (!$session) {
            return response()->json(['status' => 'error', 'message' => 'Sesi pelatihan tidak ditemukan!'], 404);
        }

        // Find or create registration for this user and training
        $trainingId = $session->training_id ?? 1;
        $registration = Registration::firstOrCreate(
            [
                'user_id'     => $user->id,
                'training_id' => $trainingId,
            ],
            [
                'status'        => 'active',
                'registered_at' => now(),
            ]
        );

        // Normalize status
        if (in_array($rawStatus, ['hadir', 'present'])) {
            $dbStatus = 'present';
            $uiStatus = 'Hadir';
            $defaultNote = 'Diset Hadir oleh Panitia';
        } elseif (in_array($rawStatus, ['izin', 'permission', 'excused', 'sakit'])) {
            $dbStatus = 'permission';
            $uiStatus = 'Izin';
            $defaultNote = 'Izin / Berhalangan';
        } elseif (in_array($rawStatus, ['reset', 'belum', 'clear'])) {
            // Delete attendance record to reset to Belum Absen
            Attendance::where('registration_id', $registration->id)
                ->where('training_session_id', $session->id)
                ->delete();

            Cache::forget('sess_stats_' . $session->id);

            \App\Services\AuditLogger::log(
                action: 'UPDATE',
                module: 'Presensi',
                description: "Mereset status presensi {$user->name} menjadi 'Belum Absen' pada sesi {$session->title}",
                status: 'SUCCESS',
                properties: [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'session_id' => $session->id,
                    'session_title' => $session->title,
                    'action' => 'reset'
                ]
            );

            return response()->json([
                'status'     => 'success',
                'message'    => "Status presensi {$user->name} pada {$session->title} berhasil di-reset (Belum Absen).",
                'user'       => $user,
                'session'    => $session,
                'attendance' => [
                    'present'             => false,
                    'status'              => 'Belum',
                    'raw_status'          => null,
                    'note'                => null,
                    'time'                => null,
                    'timestamp'           => null,
                    'training_session_id' => $session->id,
                ]
            ], 200);
        } else {
            $dbStatus = 'absent';
            $uiStatus = 'Tidak Hadir';
            $defaultNote = 'Tidak Hadir / Alpa';
        }

        $finalNote = !empty($note) ? trim($note) : $defaultNote;
        $scannerId = auth()->id() ?? 1;
        $now = now();
        $scannedTimeFormatted = $now->format('H:i') . ' WIB';

        $attendance = Attendance::updateOrCreate(
            [
                'registration_id'     => $registration->id,
                'training_session_id' => $session->id,
            ],
            [
                'scanned_by' => $scannerId,
                'scanned_at' => $now,
                'status'     => $dbStatus,
                'note'       => $finalNote,
                'source'     => $source,
            ]
        );

        Cache::forget('sess_stats_' . $session->id);

        \App\Services\AuditLogger::log(
            action: 'UPDATE',
            module: 'Presensi',
            description: "Mengubah status presensi {$user->name} menjadi '{$uiStatus}' pada sesi {$session->title}",
            status: 'SUCCESS',
            properties: [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'session_id' => $session->id,
                'session_title' => $session->title,
                'status' => $uiStatus,
                'note' => $finalNote
            ]
        );

        return response()->json([
            'status'     => 'success',
            'message'    => "Status presensi {$user->name} berhasil diubah menjadi {$uiStatus} pada {$session->title}.",
            'user'       => $user,
            'session'    => $session,
            'attendance' => [
                'present'             => $dbStatus === 'present',
                'status'              => $uiStatus,
                'raw_status'          => $dbStatus,
                'note'                => $finalNote,
                'time'                => $scannedTimeFormatted,
                'timestamp'           => $now->toISOString(),
                'source'              => $attendance->source,
                'training_session_id' => $session->id,
            ]
        ], 200);
    }

    /**
     * Batch Sync Endpoint for Offline Scanner Queue.
     * When internet drops at the venue, scanned items are synced here automatically.
     */
    public function batchSync(Request $request)
    {
        $validated = $request->validate([
            'items'                       => 'required|array|min:1',
            'items.*.user_qr_token'       => 'required|string',
            'items.*.training_session_id' => 'required|integer',
            'items.*.scanned_at'          => 'nullable|string',
            'items.*.offline_id'          => 'nullable|string',
        ]);

        $results = [];
        $syncedCount = 0;
        $failedCount = 0;
        $scannerId = auth()->id() ?? 1;

        DB::beginTransaction();
        try {
            foreach ($validated['items'] as $item) {
                $token = trim($item['user_qr_token']);
                $sessionId = (int) $item['training_session_id'];
                $scanTime = !empty($item['scanned_at']) ? Carbon::parse($item['scanned_at']) : now();

                $user = User::where('user_qr_token', $token)->first();
                if (!$user) {
                    $results[] = [
                        'offline_id' => $item['offline_id'] ?? null,
                        'status'     => 'error',
                        'message'    => "Token {$token} tidak valid",
                    ];
                    $failedCount++;
                    continue;
                }

                $session = TrainingSession::find($sessionId);
                if (!$session) {
                    $results[] = [
                        'offline_id' => $item['offline_id'] ?? null,
                        'status'     => 'error',
                        'message'    => "Sesi {$sessionId} tidak ditemukan",
                    ];
                    $failedCount++;
                    continue;
                }

                $registration = Registration::firstOrCreate(
                    ['user_id' => $user->id, 'training_id' => $session->training_id],
                    ['status' => 'active', 'registered_at' => now()]
                );

                $att = Attendance::firstOrCreate(
                    [
                        'registration_id'     => $registration->id,
                        'training_session_id' => $sessionId,
                    ],
                    [
                        'scanned_by' => $scannerId,
                        'scanned_at' => $scanTime,
                        'status'     => 'present',
                        'source'     => 'batch_sync',
                    ]
                );

                $results[] = [
                    'offline_id' => $item['offline_id'] ?? null,
                    'status'     => 'success',
                    'user_name'  => $user->name,
                    'was_new'    => $att->wasRecentlyCreated,
                ];
                $syncedCount++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal melakukan sinkronisasi batch: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'status'       => 'success',
            'message'      => "Sinkronisasi selesai: {$syncedCount} berhasil, {$failedCount} gagal.",
            'synced_count' => $syncedCount,
            'failed_count' => $failedCount,
            'results'      => $results,
        ], 200);
    }

    /**
     * Session Stats Summary with 3-second cache.
     */
    public function sessionStats(Request $request, $sessionId)
    {
        $session = $this->resolveSession($sessionId);
        if (!$session) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sesi pelatihan tidak ditemukan',
            ], 404);
        }

        $realId = $session->id;
        $cacheKey = 'sess_stats_' . $realId;

        $stats = Cache::remember($cacheKey, 3, function () use ($session, $realId) {
            $totalParticipants = Registration::where('training_id', $session->training_id)->count();
            $attendedCount = Attendance::where('training_session_id', $realId)
                ->where('status', 'present')
                ->count();

            $recentAttendances = Attendance::with(['registration.user', 'scanner'])
                ->where('training_session_id', $realId)
                ->orderBy('scanned_at', 'desc')
                ->limit(10)
                ->get()
                ->map(fn($att) => [
                    'id'         => $att->id,
                    'name'       => $att->registration?->user?->name ?? 'Peserta',
                    'email'      => $att->registration?->user?->email ?? '-',
                    'instansi'   => $att->registration?->user?->instansi ?? '-',
                    'time'       => Carbon::parse($att->scanned_at)->format('H:i:s') . ' WIB',
                    'scanned_by' => $att->scanner?->name ?? 'Panitia',
                ]);

            return [
                'session_id'         => $session->id,
                'session_title'      => $session->title,
                'total_participants' => $totalParticipants,
                'attended_count'     => $attendedCount,
                'unattended_count'   => max(0, $totalParticipants - $attendedCount),
                'recent_attendances' => $recentAttendances,
                'updated_at'         => now()->format('H:i:s'),
            ];
        });

        if (!$stats) {
            return response()->json(['status' => 'error', 'message' => 'Sesi tidak ditemukan'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $stats,
        ], 200);
    }

    /**
     * Realtime Stream (Server-Sent Events) for live stats & scan updates without page refresh!
     * Fully supported on Shared Hosting (cPanel / Apache / Nginx / Litespeed).
     */
    public function streamSessionStats($sessionId)
    {
        return response()->stream(function () use ($sessionId) {
            if (ob_get_level() > 0) {
                @ob_end_clean();
            }
            if (session_status() === PHP_SESSION_ACTIVE) {
                @session_write_close();
            }

            // Shared hosting friendly: langsung kirim 1 snapshot dan tutup koneksi
            // agar worker PHP-FPM langsung bebas untuk pengunjung lain
            $session = $this->resolveSession($sessionId);
            if (!$session) {
                echo "data: " . json_encode(['error' => 'Session not found']) . "\n\n";
                @flush();
                return;
            }

            $realId = $session->id;
            $cacheKey = 'sess_stats_' . $realId;
            $stats = Cache::remember($cacheKey, 5, function () use ($session, $realId) {
                $totalParticipants = Registration::where('training_id', $session->training_id)->count();
                $attendedCount = Attendance::where('training_session_id', $realId)
                    ->where('status', 'present')
                    ->count();

                $recentAttendances = Attendance::with(['registration.user', 'scanner'])
                    ->where('training_session_id', $realId)
                    ->orderBy('scanned_at', 'desc')
                    ->limit(10)
                    ->get()
                    ->map(fn($att) => [
                        'id'         => $att->id,
                        'name'       => $att->registration?->user?->name ?? 'Peserta',
                        'email'      => $att->registration?->user?->email ?? '-',
                        'instansi'   => $att->registration?->user?->instansi ?? '-',
                        'time'       => Carbon::parse($att->scanned_at)->format('H:i:s') . ' WIB',
                        'scanned_by' => $att->scanner?->name ?? 'Panitia',
                    ]);

                return [
                    'session_id'         => $session->id,
                    'session_title'      => $session->title,
                    'total_participants' => $totalParticipants,
                    'attended_count'     => $attendedCount,
                    'unattended_count'   => max(0, $totalParticipants - $attendedCount),
                    'recent_attendances' => $recentAttendances,
                    'updated_at'         => now()->format('H:i:s'),
                ];
            });

            echo "data: " . json_encode($stats) . "\n\n";
            @flush();
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache, no-store, must-revalidate',
            'Connection'        => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
