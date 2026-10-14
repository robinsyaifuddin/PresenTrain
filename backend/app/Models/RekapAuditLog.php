<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RekapAuditLog extends Model
{
    use HasFactory;

    protected $table = 'rekap_audit_logs';

    protected $fillable = [
        'admin_id',
        'user_id',
        'class_id',
        'sheet_name',
        'field_name',
        'old_value',
        'new_value',
        'reason',
    ];

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class, 'class_id');
    }
}
