<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'registration_id',
        'training_session_id',
        'scanned_by',
        'scanned_at',
        'status',
        'source',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function registration()
    {
        return $this->belongsTo(Registration::class);
    }

    public function session()
    {
        return $this->belongsTo(TrainingSession::class, 'training_session_id');
    }

    public function scanner()
    {
        return $this->belongsTo(User::class, 'scanned_by');
    }
}
