<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AsyncJobTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AsyncTicketController extends Controller
{
    /**
     * Get the real-time status of an async job ticket.
     * Uses micro-caching (1.5 seconds) to handle aggressive polling spikes without hitting MySQL repeatedly.
     */
    public function show(Request $request, string $id)
    {
        $cacheKey = 'async_ticket_status_' . $id;

        // Micro-cache hanya saat pending/processing (0.5s) agar perubahan status segera terdeteksi secara real-time
        $ticketData = Cache::remember($cacheKey, 1, function () use ($id) {
            $ticket = AsyncJobTicket::find($id);
            if (!$ticket) {
                return null;
            }

            return [
                'id' => $ticket->id,
                'action_type' => $ticket->action_type,
                'status' => $ticket->status,
                'progress_percent' => (int) $ticket->progress_percent,
                'message' => $ticket->message,
                'result' => $ticket->result,
                'completed_at' => $ticket->completed_at ? $ticket->completed_at->toIso8601String() : null,
                'created_at' => $ticket->created_at ? $ticket->created_at->toIso8601String() : null,
            ];
        });

        if (!$ticketData) {
            return response()->json([
                'success' => false,
                'message' => 'Tiket antrean tidak ditemukan atau sudah kadaluarsa.',
            ], 404);
        }

        // AUTO-HEAL: Jika tiket masih pending saat di-poll (karena worker queue hosting belum aktif),
        // eksekusi job handler langsung secara aman agar peserta tidak terjebak dalam antrean!
        if ($ticketData['status'] === 'pending') {
            $ticketModel = AsyncJobTicket::find($id);
            if ($ticketModel && $ticketModel->status === 'pending') {
                if ($ticketModel->action_type === 'quiz_submit') {
                    try {
                        $job = new \App\Jobs\ProcessQuizSubmissionJob($id, $ticketModel->payload ?? []);
                        $job->handle();
                        $ticketModel->refresh();
                        $ticketData = [
                            'id' => $ticketModel->id,
                            'action_type' => $ticketModel->action_type,
                            'status' => $ticketModel->status,
                            'progress_percent' => (int) $ticketModel->progress_percent,
                            'message' => $ticketModel->message,
                            'result' => $ticketModel->result,
                            'completed_at' => $ticketModel->completed_at ? $ticketModel->completed_at->toIso8601String() : null,
                            'created_at' => $ticketModel->created_at ? $ticketModel->created_at->toIso8601String() : null,
                        ];
                        Cache::put($cacheKey, $ticketData, 120);
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::warning("Auto-heal ticket {$id} failed: " . $e->getMessage());
                    }
                }
            }
        }

        // Jika status telah rampung (completed atau failed), simpan di cache lebih lama (120 detik)
        if (in_array($ticketData['status'], ['completed', 'failed'])) {
            Cache::put($cacheKey, $ticketData, 120);
        }

        return response()->json([
            'success' => true,
            'ticket' => $ticketData,
        ]);
    }
}
