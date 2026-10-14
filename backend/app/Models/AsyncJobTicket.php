<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AsyncJobTicket extends Model
{
    use HasUuids;

    protected $table = 'async_job_tickets';

    protected $fillable = [
        'id',
        'user_id',
        'action_type',
        'status',
        'progress_percent',
        'message',
        'payload',
        'result',
        'completed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'result' => 'array',
        'progress_percent' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Helper to mark ticket as processing
     */
    public function markProcessing(string $message = 'Sedang diproses...', int $progress = 30): void
    {
        $this->update([
            'status' => 'processing',
            'progress_percent' => $progress,
            'message' => $message,
        ]);
    }

    /**
     * Helper to mark ticket as completed
     */
    public function markCompleted(array $resultData = [], string $message = 'Selesai'): void
    {
        $this->update([
            'status' => 'completed',
            'progress_percent' => 100,
            'message' => $message,
            'result' => $resultData,
            'completed_at' => now(),
        ]);
    }

    /**
     * Helper to mark ticket as failed
     */
    public function markFailed(string $errorMessage, array $errorDetails = []): void
    {
        $this->update([
            'status' => 'failed',
            'progress_percent' => 100,
            'message' => $errorMessage,
            'result' => array_merge(['error' => $errorMessage], $errorDetails),
            'completed_at' => now(),
        ]);
    }
}
