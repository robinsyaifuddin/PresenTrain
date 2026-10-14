<?php

namespace App\Jobs;

use App\Models\AsyncJobTicket;
use App\Models\Attendance;
use App\Models\Registration;
use App\Models\TrainingSession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessAttendanceQueueJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 60;
    public $tries = 2;

    protected string $ticketId;
    protected array $data;

    /**
     * Create a new job instance.
     */
    public function __construct(string $ticketId, array $data)
    {
        $this->ticketId = $ticketId;
        $this->data = $data;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $ticket = AsyncJobTicket::find($this->ticketId);
        if (!$ticket) {
            return;
        }

        $ticket->markProcessing('Sedang memverifikasi data dan sesi presensi...', 30);

        try {
            $userId = $this->data['user_id'] ?? null;
            $sessionId = $this->data['session_id'] ?? null;
            $scannerId = $this->data['scanned_by'] ?? null;
            $source = $this->data['source'] ?? 'queue_scan';
            $status = $this->data['status'] ?? 'present';
            $note = $this->data['note'] ?? null;

            if (!$userId || !$sessionId) {
                throw new \Exception('Data user atau sesi tidak lengkap.');
            }

            $user = User::find($userId);
            $session = TrainingSession::find($sessionId);

            if (!$user) {
                throw new \Exception('Pengguna tidak ditemukan.');
            }
            if (!$session) {
                throw new \Exception('Sesi pelatihan tidak valid.');
            }

            $ticket->markProcessing('Menyimpan data presensi peserta...', 65);

            $resultData = DB::transaction(function () use ($user, $session, $scannerId, $source, $status, $note) {
                // Pastikan registrasi ada
                $registration = Registration::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'training_id' => $session->training_id,
                    ],
                    [
                        'status' => 'active',
                        'registered_at' => now(),
                    ]
                );

                $scannedTime = now();
                $existing = Attendance::where('registration_id', $registration->id)
                    ->where('training_session_id', $session->id)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    if ($existing->status === 'present') {
                        $formattedTime = Carbon::parse($existing->scanned_at)->format('H:i') . ' WIB';
                        return [
                            'attendance_id' => $existing->id,
                            'already_present' => true,
                            'scanned_at' => $formattedTime,
                        ];
                    }

                    // Update jika sebelumnya absent/permission
                    $existing->update([
                        'status' => $status,
                        'scanned_at' => $scannedTime,
                        'scanned_by' => $scannerId,
                        'source' => $source,
                        'note' => $note ?? 'Presensi terverifikasi via Antrean Queue',
                    ]);

                    return [
                        'attendance_id' => $existing->id,
                        'already_present' => false,
                        'scanned_at' => $scannedTime->format('H:i') . ' WIB',
                    ];
                }

                $newAttendance = Attendance::create([
                    'registration_id' => $registration->id,
                    'training_session_id' => $session->id,
                    'scanned_by' => $scannerId,
                    'scanned_at' => $scannedTime,
                    'status' => $status,
                    'source' => $source,
                    'note' => $note ?? 'Presensi terverifikasi via Antrean Queue',
                ]);

                return [
                    'attendance_id' => $newAttendance->id,
                    'already_present' => false,
                    'scanned_at' => $scannedTime->format('H:i') . ' WIB',
                ];
            });

            // Invalidate session cache
            Cache::forget('sess_stats_' . $session->id);

            $msg = ($resultData['already_present'] ?? false)
                ? "Peserta {$user->name} sudah tercatat hadir sebelumnya ({$resultData['scanned_at']})."
                : "Presensi {$user->name} berhasil dicatat pada sesi {$session->title}!";

            $ticket->markCompleted([
                'attendance_id' => $resultData['attendance_id'],
                'session_title' => $session->title,
                'user_name' => $user->name,
                'scanned_at' => $resultData['scanned_at'],
                'status' => $status,
            ], $msg);

        } catch (\Throwable $e) {
            Log::error('ProcessAttendanceQueueJob Error: ' . $e->getMessage(), [
                'ticket_id' => $this->ticketId,
                'trace' => $e->getTraceAsString(),
            ]);

            $ticket->markFailed($e->getMessage());
        }
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $ticket = AsyncJobTicket::find($this->ticketId);
        if ($ticket) {
            $ticket->markFailed('Terjadi kegagalan antrean server: ' . $exception->getMessage());
        }
    }
}
