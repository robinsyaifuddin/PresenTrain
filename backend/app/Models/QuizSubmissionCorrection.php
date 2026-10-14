<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizSubmissionCorrection extends Model
{
    use HasFactory;

    protected $table = 'quiz_submission_corrections';

    protected $fillable = [
        'quiz_submission_id',
        'admin_id',
        'old_score',
        'new_score',
        'question_scores',
        'notes',
    ];

    protected $casts = [
        'question_scores' => 'array',
    ];

    public function submission()
    {
        return $this->belongsTo(QuizSubmission::class, 'quiz_submission_id');
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
