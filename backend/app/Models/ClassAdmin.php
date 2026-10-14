<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassAdmin extends Model
{
    use HasFactory;

    protected $table = 'class_admins';

    protected $fillable = [
        'class_id',
        'user_id',
        'can_manage_attendance',
        'can_manage_assessment',
        'can_manage_quiz',
    ];

    protected $casts = [
        'can_manage_attendance' => 'boolean',
        'can_manage_assessment' => 'boolean',
        'can_manage_quiz' => 'boolean',
    ];

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class, 'class_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
