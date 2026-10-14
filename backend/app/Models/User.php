<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'google_id',
        'name',
        'email',
        'password',
        'role',
        'status',
        'class_id',
        'can_manage_attendance',
        'can_manage_assessment',
        'can_manage_quiz',
        'phone',
        'instansi',
        'gender',
        'avatar',
        'user_qr_token',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'can_manage_attendance' => 'boolean',
            'can_manage_assessment' => 'boolean',
            'can_manage_quiz' => 'boolean',
        ];
    }

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class, 'class_id');
    }

    public function managedClasses()
    {
        return $this->belongsToMany(ClassRoom::class, 'class_admins', 'user_id', 'class_id')
            ->withPivot('can_manage_attendance', 'can_manage_assessment', 'can_manage_quiz')
            ->withTimestamps();
    }

    public function registrations()
    {
        return $this->hasMany(Registration::class);
    }

    public function attendances()
    {
        return $this->hasManyThrough(Attendance::class, Registration::class);
    }

    public function assessment()
    {
        return $this->hasOne(Assessment::class, 'user_id');
    }

    public function quizSubmissions()
    {
        return $this->hasMany(QuizSubmission::class, 'user_id');
    }

    public function getAccessibleClassIdsAttribute(): array
    {
        if ($this->role === 'super_admin') {
            return ClassRoom::pluck('id')->all();
        }
        if ($this->role === 'admin') {
            return $this->managedClasses()->pluck('classes.id')->all();
        }
        return $this->class_id ? [$this->class_id] : [];
    }

    /**
     * Generate unique 6-digit numeric token for participant
     */
    public static function generateUniqueParticipantToken(): string
    {
        do {
            $token = (string) random_int(100000, 999999);
        } while (static::where('user_qr_token', $token)->exists());

        return $token;
    }
}
