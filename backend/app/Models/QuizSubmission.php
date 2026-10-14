<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuizSubmission extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'answers' => 'array',
        'question_order' => 'array',
        'option_orders' => 'array',
        'submitted_at' => 'datetime',
        'started_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_locked' => 'boolean',
        'is_corrected' => 'boolean',
        'tab_violations' => 'integer',
        'score' => 'integer',
        'original_score' => 'integer',
    ];

    public function quiz()
    {
        return $this->belongsTo(Quiz::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function corrections()
    {
        return $this->hasMany(QuizSubmissionCorrection::class, 'quiz_submission_id')->orderBy('id', 'desc');
    }
}