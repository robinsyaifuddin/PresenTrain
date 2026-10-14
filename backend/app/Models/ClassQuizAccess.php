<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassQuizAccess extends Model
{
    use HasFactory;

    protected $table = 'class_quiz_access';

    protected $fillable = [
        'class_id',
        'quiz_id',
        'status',
        'opened_by',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class, 'class_id');
    }

    public function quiz()
    {
        return $this->belongsTo(Quiz::class, 'quiz_id');
    }

    public function openedByUser()
    {
        return $this->belongsTo(User::class, 'opened_by');
    }
}
