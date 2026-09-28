<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Registration;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AttendanceScanController extends Controller
{
    /**
     * Ultra-fast single QR scan endpoint with atomic concurrency protection.
     */
    public function scan(Request $request)
    {
        $validated = $request->validate([
            'user_qr_token'       => 'required|string|max:100',
            'training_session_id' => 'required|integer',
        ]);

        $token = trim($validated['user_qr_token']);
        $sessionId = (int) $validated['training_session_id'];

        // 1. O(1) Indexed Token Lookup
        $user = User::select('id', 'name', 'email', 'instansi', 'user_qr_token')
            ->where('user_qr_token', $token)
            ->first();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => "Token QR ({$token}) tidak terdaftar dalam sistem!",
            ], 404);
        }

        // 2. Validate Session Existence
        $session = TrainingSession::select('id', 'training_id', 'title', 'status')
            ->where('id', $sessionId)
            ->first();

        if (!$session) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sesi pelatihan tidak ditemukan!',
            ], 404);
        }

        // 3. Check Registration for this Training
        $registration = Registration::select('id', 'user_id', 'training_id')
            ->where('user_id', $user->id)
            ->where('training_id', $session->training_id)
            ->first();

        if (!$registration) {
            // Auto-register participant if active event or reject
            $registration = Registration::create([
                'user_id'       => $user->id,
                'training_id'   => $session->training_id,
                'status'        => 'active',
                'registered_at' => now(),
            ]);
        }

        $scannerId = auth()->id() ?? $request->input('scanner_id');

        // 4. Atomic FirstOrCreate check (Protected by DB unique key)
        $scannedTime = now();
        $attendance = Attendance::firstOrCreate(
            [
                'registration_id'     => $registration->id,
                'training_session_id' => $sessionId,
            ],
            [
                'scanned_by' => $scannerId,
                'scanned_at' => $scannedTime,
                'status'     => 'present',
                'source'     => 'camera_scan',
            ]
        );

        // Clear cached stats for this session
        Cache::forget('sess_stats_' . $sessionId);

        // If attendance was already present previously
        if (!$attendance->wasRecentlyCreated) {
            return response()->json([
                'status'     => 'warning',
                'title'      => 'SUDAH ABSEN SEBELUMNYA!',
                'message'    => "Peserta {$user->name} sudah tercatat hadir sebelumnya pada " . Carbon::parse($attendance->scanned_at)->format('H:i:s') . ' WIB.',
                'user'       => $user,
                'scanned_at' => Carbon::parse($attendance->scanned_at)->format('H:i:s') . ' WIB',
            ], 200);
        }

        return response()->json([
            'status'     => 'success',
            'title'      => 'ABSENSI BERHASIL!',
            'message'    => "Terverifikasi! {$user->name} berhasil melakukan presensi.",
            'user'       => $user,
            'session'    => $session,
            'scanned_at' => $scannedTime->format('H:i:s') . ' WIB',
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
     * Realtime Session Stats with 5-second file cache to protect Shared Hosting CPU.
     */
    public function sessionStats(Request $request, $sessionId)
    {
        $cacheKey = 'sess_stats_' . $sessionId;

        $stats = Cache::remember($cacheKey, 5, function () use ($sessionId) {
            $session = TrainingSession::with('training')->find($sessionId);
            if (!$session) {
                return null;
            }

            $totalParticipants = Registration::where('training_id', $session->training_id)->count();
            $attendedCount = Attendance::where('training_session_id', $sessionId)
                ->where('status', 'present')
                ->count();

            $recentAttendances = Attendance::with(['registration.user', 'scanner'])
                ->where('training_session_id', $sessionId)
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
}
