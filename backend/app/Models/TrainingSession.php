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
    ];

    public function training()
    {
        return $this->belongsTo(Training::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }
}
