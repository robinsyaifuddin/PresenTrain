<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Training extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'title',
        'description',
        'location',
        'start_date',
        'end_date',
        'status',
        'created_by',
    ];

    public function sessions()
    {
        return $this->hasMany(TrainingSession::class);
    }

    public function registrations()
    {
        return $this->hasMany(Registration::class);
    }

    public function participants()
    {
        return $this->belongsToMany(User::class, 'registrations');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
