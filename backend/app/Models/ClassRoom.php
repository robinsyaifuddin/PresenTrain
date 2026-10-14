<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassRoom extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'name',
        'code',
        'description',
        'status',
    ];

    public function participants()
    {
        return $this->hasMany(User::class, 'class_id')->where('role', 'participant');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'class_id');
    }

    public function classAdmins()
    {
        return $this->hasMany(ClassAdmin::class, 'class_id');
    }

    public function admins()
    {
        return $this->belongsToMany(User::class, 'class_admins', 'class_id', 'user_id')
            ->withPivot('can_manage_attendance', 'can_manage_assessment', 'can_manage_quiz')
            ->withTimestamps();
    }

    public function quizAccess()
    {
        return $this->hasMany(ClassQuizAccess::class, 'class_id');
    }
}
