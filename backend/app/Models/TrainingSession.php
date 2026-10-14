<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'training_id',
        'session_code',
        'title',
        'speaker',
        'room',
        'session_date',
        'start_time',
        'end_time',
        'status',
        'barcode_token',
        'barcode_expires_at',
    ];

    protected $casts = [
        'barcode_expires_at' => 'datetime',
    ];

    protected $appends = [
        'computed_status',
        'is_passed',
    ];

    /**
     * Menghitung status sesi secara dinamis berdasarkan session_date, start_time, dan end_time (WIB).
     * Memberikan toleransi 15 menit sebelum start_time agar presensi sudah bisa dibuka.
     */
    public function getComputedStatusAttribute(): string
    {
        // 1. Jika sesi ditutup atau dibatalkan secara eksplisit oleh admin
        if (in_array($this->status, ['Dibatalkan', 'Ditutup_Manual'])) {
            return $this->status;
        }

        // 2. Jika barcode sesi aktif dan belum expired, pastikan status Berlangsung
        if ($this->barcode_expires_at && now()->isBefore($this->barcode_expires_at)) {
            return 'Berlangsung';
        }

        if (empty($this->session_date) || empty($this->start_time) || empty($this->end_time)) {
            return $this->status ?: 'Mendatang';
        }

        try {
            $tz = 'Asia/Jakarta';
            $now = now()->setTimezone($tz);

            // Format tanggal dan jam
            $dateStr = \Carbon\Carbon::parse($this->session_date)->format('Y-m-d');
            $startStr = date('H:i:s', strtotime($this->start_time));
            $endStr   = date('H:i:s', strtotime($this->end_time));

            $start = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} {$startStr}", $tz);
            $end   = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} {$endStr}", $tz);

            // Jika end_time lebih kecil dari start_time (sesi lintas tengah malam)
            if ($end->lt($start)) {
                $end->addDay();
            }

            // Presensi dibuka 15 menit sebelum jadwal sesi dimulai
            $openTime = $start->copy()->subMinutes(15);

            if ($now->lt($openTime)) {
                return 'Mendatang';
            } elseif ($now->between($openTime, $end)) {
                return 'Berlangsung';
            } else {
                return 'Selesai';
            }
        } catch (\Throwable $e) {
            return $this->status ?: 'Mendatang';
        }
    }

    /**
     * Memperbarui status database ke computed_status jika ada perbedaan (Lazy Auto-Sync).
     */
    public function syncDynamicStatus(): string
    {
        $calculated = $this->computed_status;
        if ($calculated && in_array($calculated, ['Mendatang', 'Berlangsung', 'Selesai'])) {
            if ($this->status !== $calculated) {
                $this->status = $calculated;
                $this->saveQuietly();
            }
        }
        return $calculated;
    }

    /**
     * Cek apakah sesi ini sudah selesai/lewat jadwalnya secara waktu WIB atau statusnya Selesai.
     */
    public function getIsPassedAttribute(): bool
    {
        if (in_array($this->status, ['Selesai', 'Ditutup_Manual'])) {
            return true;
        }

        if (empty($this->session_date) || empty($this->end_time)) {
            return false;
        }

        try {
            $tz = 'Asia/Jakarta';
            $now = now()->setTimezone($tz);
            $dateStr = \Carbon\Carbon::parse($this->session_date)->format('Y-m-d');
            $startStr = $this->start_time ? date('H:i:s', strtotime($this->start_time)) : '00:00:00';
            $endStr   = date('H:i:s', strtotime($this->end_time));

            $start = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} {$startStr}", $tz);
            $end   = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} {$endStr}", $tz);
            if ($end->lt($start)) {
                $end->addDay();
            }

            return $now->gt($end);
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function training()
    {
        return $this->belongsTo(Training::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }
}

