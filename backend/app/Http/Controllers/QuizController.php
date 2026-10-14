<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\Question;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    private function formatQuiz($quiz, $isParticipant = false, $userClassId = null)
    {
        $accessStatus = 'buka';
        if ($isParticipant) {
            $access = null;
            if ($userClassId !== null) {
                $access = \App\Models\ClassQuizAccess::where('class_id', $userClassId)
                    ->where('quiz_id', $quiz->id)
                    ->first();
            }
            if (!$access) {
                $access = \App\Models\ClassQuizAccess::whereNull('class_id')
                    ->where('quiz_id', $quiz->id)
                    ->first();
            }
            $accessStatus = $access ? $access->status : 'tutup';
        }

        return [
            'id' => $quiz->quiz_code ?: (string)$quiz->id,
            'db_id' => $quiz->id,
            'quiz_code' => $quiz->quiz_code,
            'title' => $quiz->title,
            'type' => $quiz->type,
            'durationMinutes' => $quiz->duration_minutes,
            'duration_minutes' => $quiz->duration_minutes,
            'passingGrade' => $quiz->passing_grade,
            'passing_grade' => $quiz->passing_grade,
            'linkCode' => $quiz->link_code,
            'link_code' => $quiz->link_code,
            'status' => $quiz->status,
            'access_status' => $accessStatus,
            'is_open' => $accessStatus === 'buka',
            'createdBy' => $quiz->created_by,
            'createdAt' => $quiz->created_at ? ($quiz->created_at instanceof \DateTimeInterface ? $quiz->created_at->format('d/m/Y') : (string)$quiz->created_at) : null,
            'created_at' => $quiz->created_at,
            'description' => $quiz->description,
            'instructions' => $quiz->instructions,
            'is_active' => (bool)$quiz->is_active,
            'training_id' => $quiz->training_id,
            'questions' => ($quiz->questions ?: collect())->map(function ($q) use ($isParticipant) {
                $item = [
                    'id' => $q->question_code ?: (string)$q->id,
                    'db_id' => $q->id,
                    'type' => $q->type,
                    'text' => $q->text,
                    'options' => $q->options ?: [],
                    'scoreWeight' => $q->score_weight,
                    'score_weight' => $q->score_weight,
                    'required' => (bool)$q->required,
                ];
                // HIDE correctAnswer for participants to prevent leakage
                if (!$isParticipant) {
                    $item['correctAnswer'] = $q->correct_answer;
                    $item['correct_answer'] = $q->correct_answer;
                }
                return $item;
            })->values()->all(),
        ];
    }

    public function index()
    {
        $user = auth('sanctum')->user() ?: auth()->user();
        $isParticipant = $user && $user->role === 'participant';
        $userClassId = $isParticipant ? $user->class_id : null;
        $quizzes = Quiz::with('questions')->orderBy('id', 'desc')->get();
        return response()->json($quizzes->map(fn($q) => $this->formatQuiz($q, $isParticipant, $userClassId)));
    }

    public function show($id)
    {
        $user = auth('sanctum')->user() ?: auth()->user();
        $isParticipant = $user && $user->role === 'participant';
        $userClassId = $isParticipant ? $user->class_id : null;
        $quiz = Quiz::with('questions')
            ->where('id', $id)
            ->orWhere('quiz_code', $id)
            ->orWhere('link_code', $id)
            ->firstOrFail();

        return response()->json($this->formatQuiz($quiz, $isParticipant, $userClassId));
    }

    /**
     * Start Quiz session with per-participant deterministic shuffle.
     */
    public function start(Request $request, $id)
    {
        $quiz = Quiz::with('questions')
            ->where('id', $id)
            ->orWhere('quiz_code', $id)
            ->orWhere('link_code', $id)
            ->firstOrFail();

        $user = auth('sanctum')->user() ?: auth()->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Autentikasi diperlukan.'], 401);
        }

        // Check if quiz is open for participant's class
        $classId = $user->class_id; // null = Kelas Umum
        $access = null;
        if ($classId !== null) {
            $access = \App\Models\ClassQuizAccess::where('class_id', $classId)->where('quiz_id', $quiz->id)->first();
        }
        if (!$access) {
            $access = \App\Models\ClassQuizAccess::whereNull('class_id')->where('quiz_id', $quiz->id)->first();
        }
        $isBuka = $access && $access->status === 'buka';

        // Super Admin or Admin can always preview
        if ($user->role === 'participant' && !$isBuka) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kuis saat ini sedang DITUTUP untuk kelas Anda. Silakan hubungi panitia administrator.',
            ], 403);
        }

        // Check or create submission session
        $submission = \App\Models\QuizSubmission::firstOrCreate(
            ['quiz_id' => $quiz->id, 'user_id' => $user->id],
            [
                'submission_code' => 'SUB-' . rand(1000, 9999),
                'participant_name' => $user->name,
                'participant_email' => $user->email,
                'score' => 0,
                'original_score' => 0,
                'answers' => [],
                'is_locked' => false,
                'is_corrected' => false,
                'started_at' => now(),
                'expires_at' => now()->addMinutes($quiz->duration_minutes ?: 15),
            ]
        );

        $now = now();
        $durationSeconds = ($quiz->duration_minutes ?: 15) * 60;
        $expiresAt = $submission->expires_at ?: $submission->created_at->addMinutes($quiz->duration_minutes ?: 15);
        $remainingSeconds = max(0, $now->diffInSeconds($expiresAt, false));

        // Deterministic questions and options shuffle
        $questions = $quiz->questions->values()->all();
        $seed = crc32($quiz->id . '_' . $user->id);
        mt_srand($seed);

        // Shuffle questions
        for ($i = count($questions) - 1; $i > 0; $i--) {
            $j = mt_rand(0, $i);
            $tmp = $questions[$i];
            $questions[$i] = $questions[$j];
            $questions[$j] = $tmp;
        }

        // Shuffle options for multiple choice questions
        $shuffledQuestions = array_map(function ($q) {
            $options = is_array($q->options) ? $q->options : [];
            if ($q->type === 'multiple_choice' && count($options) > 1) {
                for ($i = count($options) - 1; $i > 0; $i--) {
                    $j = mt_rand(0, $i);
                    $tmp = $options[$i];
                    $options[$i] = $options[$j];
                    $options[$j] = $tmp;
                }
            }
            return [
                'id' => $q->question_code ?: (string)$q->id,
                'db_id' => $q->id,
                'type' => $q->type,
                'text' => $q->text,
                'options' => $options,
                'scoreWeight' => $q->score_weight,
                'score_weight' => $q->score_weight,
                'required' => (bool)$q->required,
            ];
        }, $questions);

        return response()->json([
            'status' => 'success',
            'data' => [
                'quiz' => [
                    'id' => $quiz->quiz_code ?: (string)$quiz->id,
                    'db_id' => $quiz->id,
                    'title' => $quiz->title,
                    'type' => $quiz->type,
                    'durationMinutes' => $quiz->duration_minutes,
                    'passingGrade' => $quiz->passing_grade,
                    'instructions' => $quiz->instructions,
                    'description' => $quiz->description,
                ],
                'submission' => [
                    'id' => $submission->submission_code ?: (string)$submission->id,
                    'db_id' => $submission->id,
                    'isLocked' => (bool)$submission->is_locked,
                    'score' => (int)$submission->score,
                    'answers' => $submission->answers ?: [],
                    'startedAt' => $submission->started_at,
                    'expiresAt' => $expiresAt,
                    'remainingSeconds' => $remainingSeconds,
                ],
                'questions' => $shuffledQuestions,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $quizCode = $data['id'] ?? $data['quiz_code'] ?? ('QZ-' . strtoupper(uniqid()));
        
        $quiz = Quiz::create([
            'quiz_code' => $quizCode,
            'training_id' => $data['training_id'] ?? null,
            'title' => $data['title'] ?? 'Kuis Baru',
            'type' => $data['type'] ?? 'pretest',
            'duration_minutes' => $data['durationMinutes'] ?? $data['duration_minutes'] ?? 15,
            'passing_grade' => $data['passingGrade'] ?? $data['passing_grade'] ?? 70,
            'link_code' => $data['linkCode'] ?? $data['link_code'] ?? ('QUIZ-' . rand(1000, 9999)),
            'instructions' => $data['instructions'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'Aktif',
            'created_by' => $data['createdBy'] ?? $data['created_by'] ?? 'Admin',
            'is_active' => $data['is_active'] ?? true,
        ]);

        if (!empty($data['questions']) && is_array($data['questions'])) {
            foreach ($data['questions'] as $q) {
                Question::create([
                    'quiz_id' => $quiz->id,
                    'question_code' => $q['id'] ?? null,
                    'type' => $q['type'] ?? 'multiple_choice',
                    'text' => $q['text'] ?? $q['question_text'] ?? '',
                    'options' => $q['options'] ?? [],
                    'correct_answer' => $q['correctAnswer'] ?? $q['correct_answer'] ?? null,
                    'score_weight' => $q['scoreWeight'] ?? $q['score_weight'] ?? 25,
                    'required' => $q['required'] ?? true,
                ]);
            }
        }

        $quiz->load('questions');

        \App\Services\AuditLogger::log(
            action: 'CREATE',
            module: 'Kuis',
            description: "Membuat kuis baru: '{$quiz->title}' ({$quiz->quiz_code})",
            status: 'SUCCESS',
            properties: [
                'quiz_id' => $quiz->id,
                'quiz_code' => $quiz->quiz_code,
                'title' => $quiz->title,
                'type' => $quiz->type,
                'duration_minutes' => $quiz->duration_minutes
            ]
        );

        return response()->json($this->formatQuiz($quiz), 201);
    }

    public function update(Request $request, $id)
    {
        $quiz = Quiz::where('id', $id)->orWhere('quiz_code', $id)->firstOrFail();
        $data = $request->all();

        $quiz->update([
            'title' => $data['title'] ?? $quiz->title,
            'type' => $data['type'] ?? $quiz->type,
            'duration_minutes' => $data['durationMinutes'] ?? $data['duration_minutes'] ?? $quiz->duration_minutes,
            'passing_grade' => $data['passingGrade'] ?? $data['passing_grade'] ?? $quiz->passing_grade,
            'link_code' => $data['linkCode'] ?? $data['link_code'] ?? $quiz->link_code,
            'instructions' => $data['instructions'] ?? $quiz->instructions,
            'description' => $data['description'] ?? $quiz->description,
            'status' => $data['status'] ?? $quiz->status,
            'created_by' => $data['createdBy'] ?? $data['created_by'] ?? $quiz->created_by,
            'is_active' => $data['is_active'] ?? $quiz->is_active,
        ]);

        if (isset($data['questions']) && is_array($data['questions'])) {
            $quiz->questions()->delete();
            foreach ($data['questions'] as $q) {
                Question::create([
                    'quiz_id' => $quiz->id,
                    'question_code' => $q['id'] ?? null,
                    'type' => $q['type'] ?? 'multiple_choice',
                    'text' => $q['text'] ?? $q['question_text'] ?? '',
                    'options' => $q['options'] ?? [],
                    'correct_answer' => $q['correctAnswer'] ?? $q['correct_answer'] ?? null,
                    'score_weight' => $q['scoreWeight'] ?? $q['score_weight'] ?? 25,
                    'required' => $q['required'] ?? true,
                ]);
            }
        }

        $quiz->load('questions');

        \App\Services\AuditLogger::log(
            action: 'UPDATE',
            module: 'Kuis',
            description: "Memperbarui kuis: '{$quiz->title}' ({$quiz->quiz_code})",
            status: 'SUCCESS',
            properties: [
                'quiz_id' => $quiz->id,
                'quiz_code' => $quiz->quiz_code,
                'title' => $quiz->title
            ]
        );

        return response()->json($this->formatQuiz($quiz));
    }

    public function destroy($id)
    {
        $quiz = Quiz::where('id', $id)->orWhere('quiz_code', $id)->firstOrFail();
        $title = $quiz->title;
        $code = $quiz->quiz_code;
        $quizId = $quiz->id;

        $quiz->delete();

        \App\Services\AuditLogger::log(
            action: 'DELETE',
            module: 'Kuis',
            description: "Menghapus kuis: '{$title}' ({$code})",
            status: 'SUCCESS',
            properties: [
                'quiz_id' => $quizId,
                'quiz_code' => $code,
                'title' => $title
            ]
        );

        return response()->json(['message' => 'Quiz deleted successfully'], 200);
    }

    public function duplicate($id)
    {
        $quiz = Quiz::with('questions')->where('id', $id)->orWhere('quiz_code', $id)->firstOrFail();

        $newQuizCode = 'QZ-' . strtoupper(uniqid());
        $newLinkCode = 'QUIZ-' . rand(1000, 9999);

        $newQuiz = Quiz::create([
            'quiz_code' => $newQuizCode,
            'training_id' => $quiz->training_id,
            'title' => $quiz->title . ' (Duplikat)',
            'type' => $quiz->type,
            'duration_minutes' => $quiz->duration_minutes,
            'passing_grade' => $quiz->passing_grade,
            'link_code' => $newLinkCode,
            'instructions' => $quiz->instructions,
            'description' => $quiz->description,
            'status' => 'Aktif',
            'created_by' => auth()->user()?->name ?: ($quiz->created_by ?: 'Admin'),
            'is_active' => true,
        ]);

        foreach ($quiz->questions as $q) {
            Question::create([
                'quiz_id' => $newQuiz->id,
                'question_code' => 'QT-' . strtoupper(uniqid()),
                'type' => $q->type,
                'text' => $q->text,
                'options' => $q->options ?: [],
                'correct_answer' => $q->correct_answer,
                'score_weight' => $q->score_weight,
                'required' => (bool)$q->required,
            ]);
        }

        // Buka akses kuis hasil duplikasi secara otomatis agar peserta langsung dapat mengerjakan
        try {
            $classes = \App\Models\ClassRoom::where('status', 'Aktif')->get();
            foreach ($classes as $cls) {
                \App\Models\ClassQuizAccess::firstOrCreate(
                    ['class_id' => $cls->id, 'quiz_id' => $newQuiz->id],
                    ['status' => 'buka', 'opened_at' => now()]
                );
            }
            // Akses Kelas Umum (class_id = null)
            \App\Models\ClassQuizAccess::firstOrCreate(
                ['class_id' => null, 'quiz_id' => $newQuiz->id],
                ['status' => 'buka', 'opened_at' => now()]
            );
        } catch (\Throwable $e) {
            \Log::warning('Auto class quiz access on duplicate error: ' . $e->getMessage());
        }

        $newQuiz->load('questions');
        return response()->json([
            'status' => 'success',
            'message' => 'Kuis berhasil diduplikat',
            'data' => $this->formatQuiz($newQuiz)
        ], 201);
    }
}