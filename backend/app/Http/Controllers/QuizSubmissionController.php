<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\QuizSubmission;
use App\Models\QuizGradeRequest;
use Illuminate\Http\Request;

class QuizSubmissionController extends Controller
{
    public static function normalizeAnswerText($val)
    {
        if ($val === null || $val === '') return '';
        if (is_array($val)) {
            $val = $val['text'] ?? $val['label'] ?? $val['value'] ?? $val['title'] ?? reset($val) ?? '';
        }
        $str = html_entity_decode((string)$val, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $str = preg_replace('/\x{00A0}/u', ' ', $str);
        $str = str_replace(["\r\n", "\r", "\n", "\t"], ' ', $str);
        $str = str_replace(['‘', '’', '“', '”', '`'], ["'", "'", '"', '"', "'"], $str);
        $str = preg_replace('/\s+/', ' ', $str);
        return trim($str);
    }

    public static function isAnswerMatch($userAns, $correctAns, $options = [])
    {
        if ($userAns === null || $correctAns === null || $userAns === '' || $correctAns === '') return false;

        $normUser = self::normalizeAnswerText($userAns);
        $normCorrect = self::normalizeAnswerText($correctAns);

        if ($normUser === '' || $normCorrect === '') return false;

        if (strcasecmp($normUser, $normCorrect) === 0) {
            return true;
        }

        $stripPrefix = function($str) {
            return trim(preg_replace('/^[A-Za-z0-9][\.\)\-\:\s\]]+\s*/iu', '', $str));
        };

        $extractPrefix = function($str) {
            if (preg_match('/^([A-Za-z0-9])[\.\)\-\:\s\]]/iu', $str, $m)) {
                return strtoupper($m[1]);
            }
            if (strlen($str) <= 2) {
                return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $str));
            }
            return '';
        };

        $userNoPrefix = $stripPrefix($normUser);
        $correctNoPrefix = $stripPrefix($normCorrect);

        // 2. Bandingkan isi teks tanpa prefix huruf (jika keduanya memiliki teks substansi)
        if (!empty($userNoPrefix) && !empty($correctNoPrefix) && strcasecmp($userNoPrefix, $correctNoPrefix) === 0) {
            return true;
        }

        $userPrefix = $extractPrefix($normUser);
        $correctPrefix = $extractPrefix($normCorrect);

        // 3. Hanya cocokan prefix murni jika salah satu sisi memang HANYA huruf singkat
        $isUserOnlyLetter = strlen($normUser) <= 2 || empty($userNoPrefix);
        $isCorrectOnlyLetter = strlen($normCorrect) <= 2 || empty($correctNoPrefix);

        if (($isUserOnlyLetter || $isCorrectOnlyLetter) && !empty($userPrefix) && !empty($correctPrefix) && $userPrefix === $correctPrefix) {
            return true;
        }

        // 4. Match against options array jika disediakan
        if (is_array($options) && count($options) > 0) {
            $correctIdx = -1;
            $userIdx = -1;

            foreach ($options as $idx => $opt) {
                $optLetter = chr(65 + (int)$idx);
                $normOpt = self::normalizeAnswerText($opt);
                $optNoPrefix = $stripPrefix($normOpt);
                $optPrefix = $extractPrefix($normOpt);

                // Cek apakah correctAns merujuk ke opsi ini
                if (
                    strcasecmp($normCorrect, $normOpt) === 0 ||
                    (!empty($correctNoPrefix) && !empty($optNoPrefix) && strcasecmp($correctNoPrefix, $optNoPrefix) === 0) ||
                    ($isCorrectOnlyLetter && ($correctPrefix === $optLetter || $correctPrefix === $optPrefix)) ||
                    (is_numeric($normCorrect) && (int)$normCorrect === (int)$idx)
                ) {
                    $correctIdx = $idx;
                }

                // Cek apakah userAns merujuk ke opsi ini
                if (
                    strcasecmp($normUser, $normOpt) === 0 ||
                    (!empty($userNoPrefix) && !empty($optNoPrefix) && strcasecmp($userNoPrefix, $optNoPrefix) === 0) ||
                    ($isUserOnlyLetter && ($userPrefix === $optLetter || $userPrefix === $optPrefix)) ||
                    (is_numeric($normUser) && (int)$normUser === (int)$idx)
                ) {
                    $userIdx = $idx;
                }
            }

            if ($correctIdx !== -1 && $userIdx !== -1 && $correctIdx === $userIdx) {
                return true;
            }
        }

        return false;
    }

    private function formatSubmission($sub)
    {
        $rawAnswers = is_array($sub->answers) ? $sub->answers : (is_string($sub->answers) ? json_decode($sub->answers, true) : []);
        if (!is_array($rawAnswers)) $rawAnswers = [];

        $questionScores = $rawAnswers['_questionScores'] ?? null;
        $questionFeedbacks = $rawAnswers['_questionFeedbacks'] ?? null;

        $cleanAnswers = $rawAnswers;
        unset($cleanAnswers['_questionScores'], $cleanAnswers['_questionFeedbacks']);

        return [
            'id' => $sub->submission_code ?: (string)$sub->id,
            'db_id' => $sub->id,
            'submission_code' => $sub->submission_code,
            'quizId' => $sub->quiz ? ($sub->quiz->quiz_code ?: (string)$sub->quiz->id) : (string)$sub->quiz_id,
            'quiz_id' => $sub->quiz_id,
            'quiz_code' => $sub->quiz ? $sub->quiz->quiz_code : null,
            'quizTitle' => $sub->quiz ? $sub->quiz->title : null,
            'quiz_title' => $sub->quiz ? $sub->quiz->title : null,
            'quiz' => $sub->quiz,
            'participantId' => $sub->user_id ? "USR-{$sub->user_id}" : ($sub->participant_name ?: 'USR-LOCAL'),
            'user_id' => $sub->user_id,
            'participantName' => $sub->participant_name,
            'participant_name' => $sub->participant_name,
            'participantEmail' => $sub->participant_email,
            'participant_email' => $sub->participant_email,
            'score' => (int)$sub->score,
            'originalScore' => $sub->original_score !== null ? (int)$sub->original_score : (int)$sub->score,
            'original_score' => $sub->original_score !== null ? (int)$sub->original_score : (int)$sub->score,
            'submittedAt' => $this->formatDateTime($sub->submitted_at ?? $sub->created_at),
            'submitted_at' => $sub->submitted_at ?: $sub->created_at,
            'isLocked' => (bool)$sub->is_locked,
            'is_locked' => (bool)$sub->is_locked,
            'isCorrected' => (bool)$sub->is_corrected,
            'is_corrected' => (bool)$sub->is_corrected,
            'adminNotes' => $sub->admin_notes,
            'admin_notes' => $sub->admin_notes,
            'submitReason' => $sub->submit_reason ?: 'normal',
            'submit_reason' => $sub->submit_reason ?: 'normal',
            'tabViolations' => (int)($sub->tab_violations ?? 0),
            'tab_violations' => (int)($sub->tab_violations ?? 0),
            'answers' => $cleanAnswers,
            'questionScores' => $questionScores,
            'questionFeedbacks' => $questionFeedbacks,
            'corrections' => ($sub->corrections ?: collect())->map(function ($c) {
                return [
                    'id' => $c->id,
                    'oldScore' => $c->old_score,
                    'newScore' => $c->new_score,
                    'notes' => $c->notes,
                    'createdAt' => $this->formatDateTime($c->created_at),
                ];
            })->values()->all(),
        ];
    }

    private function formatDateTime($val)
    {
        if (empty($val)) return null;
        if ($val instanceof \DateTimeInterface) {
            return $val->format('d/m/Y H:i') . ' WIB';
        }
        if (is_string($val)) {
            try {
                return \Carbon\Carbon::parse($val)->format('d/m/Y H:i') . ' WIB';
            } catch (\Throwable $e) {
                return $val;
            }
        }
        return (string)$val;
    }

    public function index(Request $request)
    {
        $query = QuizSubmission::with('quiz', 'user', 'corrections')->orderBy('id', 'desc');

        $quizId = $request->route('quizId') ?: ($request->get('quiz_id') ?: $request->get('quizId'));
        if ($quizId) {
            $query->where(function($q) use ($quizId) {
                $q->where('quiz_id', $quizId)
                  ->orWhereHas('quiz', function($sq) use ($quizId) {
                      $sq->where('id', $quizId)->orWhere('quiz_code', $quizId)->orWhere('link_code', $quizId);
                  });
            });
        }

        // Class Scoping
        $currentUser = auth('sanctum')->user() ?: auth()->user();
        $classId = $request->query('class_id');

        if ($currentUser && $currentUser->role === 'admin') {
            $accessibleClassIds = $currentUser->managedClasses()->pluck('classes.id')->all();
            $query->whereHas('user', function ($uq) use ($accessibleClassIds, $classId) {
                if ($classId && in_array((int)$classId, $accessibleClassIds)) {
                    $uq->where('class_id', $classId);
                } else {
                    $uq->whereIn('class_id', $accessibleClassIds);
                }
            });
        } elseif ($classId !== null) {
            $query->whereHas('user', function ($uq) use ($classId) {
                if ($classId === 'general' || $classId === 'none' || $classId === '0') {
                    $uq->whereNull('class_id');
                } else {
                    $uq->where('class_id', $classId);
                }
            });
        }

        $submissions = $query->get();
        // Pastikan tidak ada data duplikat per peserta per kuis (ambil riwayat terbaru/tertinggi)
        $uniqueSubmissions = $submissions->unique(function ($s) {
            $userKey = $s->user_id ?: ($s->participant_email ?: ($s->participant_name ?: $s->id));
            $quizKey = $s->quiz_id ?: ($s->quiz ? ($s->quiz->quiz_code ?: $s->quiz->id) : 'unknown');
            return "{$quizKey}_{$userKey}";
        })->values();

        return response()->json($uniqueSubmissions->map(fn($s) => $this->formatSubmission($s)));
    }

    public function show($id)
    {
        $sub = QuizSubmission::with('quiz', 'user')
            ->where('id', $id)
            ->orWhere('submission_code', $id)
            ->firstOrFail();

        return response()->json($this->formatSubmission($sub));
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $quizIdentifier = $request->route('quizId') ?: ($data['quizId'] ?? $data['quiz_id'] ?? null);
        
        $quiz = null;
        if ($quizIdentifier) {
            $quiz = Quiz::where('id', $quizIdentifier)
                ->orWhere('quiz_code', $quizIdentifier)
                ->orWhere('link_code', $quizIdentifier)
                ->first();
        }

        // Jangan pernah menyimpan ke kuis lain secara diam-diam: jika kuis tidak ditemukan, tolak.
        if (!$quiz) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kuis tidak ditemukan. Jawaban tidak dapat disimpan.',
            ], 404);
        }

        // =========================================================================
        // ASYNC QUEUE MODE (Mencegah Crash Saat Ratusan/Ribuan Siswa Submit Bersamaan)
        // =========================================================================
        if ($request->boolean('async') || $request->boolean('queue')) {
            $ticketPayload = array_merge($data, [
                'quiz_id' => $quiz->id,
                'quiz_title' => $quiz->title,
                'participant_name' => $data['participantName'] ?? $data['participant_name'] ?? 'Peserta',
            ]);

            $ticket = \App\Models\AsyncJobTicket::create([
                'user_id' => auth()->id() ?? ($data['user_id'] ?? null),
                'action_type' => 'quiz_submit',
                'status' => 'pending',
                'progress_percent' => 15,
                'message' => 'Jawaban kuis telah masuk dalam antrean server...',
                'payload' => $ticketPayload,
            ]);

            \App\Jobs\ProcessQuizSubmissionJob::dispatch($ticket->id, $ticketPayload);

            return response()->json([
                'status' => 'queued',
                'message' => 'Jawaban kuis Anda sedang diproses oleh server.',
                'ticket_id' => $ticket->id,
                'quiz' => [
                    'id' => $quiz->id,
                    'title' => $quiz->title,
                ],
            ], 202);
        }

        // Pastikan submit_reason selalu string valid
        foreach (['submitReason', 'submit_reason'] as $reasonKey) {
            if (isset($data[$reasonKey]) && (!is_string($data[$reasonKey]) || !in_array($data[$reasonKey], ['normal', 'time_out', 'tab_violation', 'reload_violation'], true))) {
                $data[$reasonKey] = 'normal';
            }
        }

        $finalQuizId = $quiz->id;

        // Resolve user_id cleanly: prioritaskan user yang sedang login via auth token
        $authenticatedUser = auth('sanctum')->user() ?: auth()->user();
        $isAdminRole = $authenticatedUser && in_array($authenticatedUser->role, ['admin', 'super_admin']);

        // Jika dipanggil oleh Admin saat koreksi manual, user_id harus merujuk ke peserta yang dinilai, BUKAN ID admin
        $userId = ($isAdminRole ? null : ($authenticatedUser ? $authenticatedUser->id : null)) ?: ($data['user_id'] ?? null);

        if (!$userId && !empty($data['participantId'])) {
            $cleaned = preg_replace('/[^0-9]/', '', (string)$data['participantId']);
            if (!empty($cleaned)) {
                $userId = (int)$cleaned;
            }
        }
        if (!$userId && !empty($data['participantEmail'])) {
            $userRecord = \App\Models\User::where('email', $data['participantEmail'])->first();
            if ($userRecord) {
                $userId = $userRecord->id;
            }
        }

        // Tautkan identitas nama dan email secara akurat ke akun pengguna asli agar tidak tertukar
        $participantName = $data['participantName'] ?? $data['participant_name'] ?? null;
        $participantEmail = $data['participantEmail'] ?? $data['participant_email'] ?? null;
        $userClassId = null;

        if (!$isAdminRole && $authenticatedUser) {
            $participantName = $authenticatedUser->name ?: $participantName;
            $participantEmail = $authenticatedUser->email ?: $participantEmail;
            $userClassId = $authenticatedUser->class_id;
        } elseif ($userId) {
            $foundUser = \App\Models\User::find($userId);
            if ($foundUser) {
                $participantName = $foundUser->name ?: $participantName;
                $participantEmail = $foundUser->email ?: $participantEmail;
                $userClassId = $foundUser->class_id;
            }
        }

        // Validasi Status Akses Kelas: Jika kuis DITUTUP oleh Administrator untuk kelas peserta, tolak pengiriman siswa (admin tetap berhak mengoreksi/input nilai)
        $isParticipantRole = !$isAdminRole && (($authenticatedUser && $authenticatedUser->role === 'participant') || 
                             ($userId && ($foundUser ?? null) && ($foundUser->role ?? null) === 'participant'));
        if ($isParticipantRole) {
            $classAccess = null;
            if ($userClassId !== null) {
                $classAccess = \App\Models\ClassQuizAccess::where('class_id', $userClassId)
                    ->where('quiz_id', $quiz->id)
                    ->first();
            }
            if (!$classAccess) {
                $classAccess = \App\Models\ClassQuizAccess::whereNull('class_id')
                    ->where('quiz_id', $quiz->id)
                    ->first();
            }
            $isBuka = $classAccess && $classAccess->status === 'buka';
            if (!$isBuka) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Kuis saat ini telah DITUTUP oleh Administrator untuk kelas Anda. Jawaban tidak dapat dikirimkan.',
                ], 403);
            }
        }

        // Prepare answers array
        $rawAnswers = $data['answers'] ?? [];
        if (is_string($rawAnswers)) {
            $rawAnswers = json_decode($rawAnswers, true) ?: [];
        }
        if (!is_array($rawAnswers)) {
            $rawAnswers = [];
        }

        if (isset($data['questionScores'])) {
            $rawAnswers['_questionScores'] = $data['questionScores'];
        }
        if (isset($data['questionFeedbacks'])) {
            $rawAnswers['_questionFeedbacks'] = $data['questionFeedbacks'];
        }

        // Auto-grade berdasarkan kunci jawaban di database jika soal memiliki kunci
        $calculatedScore = 0;
        $autoQuestionScores = [];
        $hasServerQuestions = $quiz->questions()->exists();
        if ($hasServerQuestions) {
            $questions = $quiz->questions()->get();
            $defaultWeight = count($questions) > 0 ? (int)round(100 / count($questions)) : 20;
            $totalPossibleWeight = 0;
            $totalEarnedWeight = 0;

            foreach ($questions as $qIndex => $q) {
                $qCode = $q->question_code ?: (string)$q->id;
                $qDbId = (string)$q->id;
                
                $userAns = null;
                $candidates = [$qCode, $qDbId, (int)$q->id, $qIndex, (string)$qIndex, $qIndex + 1, (string)($qIndex + 1)];
                foreach ($candidates as $cand) {
                    if (isset($rawAnswers[$cand]) && $rawAnswers[$cand] !== null && $rawAnswers[$cand] !== '') {
                        $userAns = $rawAnswers[$cand];
                        break;
                    }
                }

                $weight = (int)($q->score_weight ?: $defaultWeight);
                if ($weight <= 0) $weight = $defaultWeight;
                $totalPossibleWeight += $weight;

                $awarded = 0;

                if ($q->type === 'multiple_choice' || empty($q->type)) {
                    $correct = trim((string)$q->correct_answer);
                    if (self::isAnswerMatch($userAns, $correct, $q->options ?: [])) {
                        $awarded = $weight;
                    }
                } elseif ($q->type === 'essay') {
                    if (!empty($userAns) && strlen(trim((string)$userAns)) > 5) {
                        $awarded = $weight;
                    }
                }

                $autoQuestionScores[$qCode] = $awarded;
                if ($qDbId !== $qCode) {
                    $autoQuestionScores[$qDbId] = $awarded;
                }
                $totalEarnedWeight += $awarded;
            }

            if ($totalPossibleWeight > 0) {
                $calculatedScore = (int)round(($totalEarnedWeight / $totalPossibleWeight) * 100);
            } else {
                $calculatedScore = min($totalEarnedWeight, 100);
            }
            $calculatedScore = max(0, min(100, $calculatedScore));
        }

        if (!isset($rawAnswers['_questionScores']) && !empty($autoQuestionScores)) {
            $rawAnswers['_questionScores'] = $autoQuestionScores;
        }

        $isManualGrading = auth()->check() && in_array(auth()->user()->role, ['admin', 'super_admin']);
        $finalScoreToSave = ($isManualGrading && isset($data['score']))
            ? (int)$data['score']
            : ($hasServerQuestions ? $calculatedScore : (isset($data['score']) ? (int)$data['score'] : 0));

        // =========================================================================
        // ATOMIC TRANSACTION: Check-then-Insert Quiz Submission (Race-Condition Safe)
        // lockForUpdate() mencegah 2 request submit bersamaan (double-click / 2 tab)
        // sama-sama membaca existing=null lalu keduanya insert → duplikasi submission
        // =========================================================================
        try {
            $result = \Illuminate\Support\Facades\DB::transaction(function () use ($finalQuizId, $userId, $data, $rawAnswers, $finalScoreToSave, $participantName, $participantEmail) {
                $existing = null;
                if ($userId) {
                    $existing = QuizSubmission::where('quiz_id', $finalQuizId)
                        ->where('user_id', $userId)
                        ->lockForUpdate()
                        ->first();
                }
                if (!$existing && !empty($participantEmail)) {
                    $existing = QuizSubmission::where('quiz_id', $finalQuizId)
                        ->where('participant_email', $participantEmail)
                        ->lockForUpdate()
                        ->first();
                }
                if (!$existing && !empty($participantName) && !in_array(strtolower(trim($participantName)), ['peserta', 'user', 'guest', 'peserta pelatihan', 'admin'])) {
                    $existing = QuizSubmission::where('quiz_id', $finalQuizId)
                        ->where('participant_name', $participantName)
                        ->lockForUpdate()
                        ->first();
                }
                if (!$existing && !empty($data['id'])) {
                    $existing = QuizSubmission::where('submission_code', $data['id'])
                        ->lockForUpdate()
                        ->first();
                }

                if ($existing) {
                    return ['type' => 'existing', 'submission' => $existing];
                }

                $initScore = $finalScoreToSave;
                $submittedReason = $data['submitReason'] ?? $data['submit_reason'] ?? 'normal';
                $submittedViolations = (int)($data['tabViolations'] ?? $data['tab_violations'] ?? 0);
                if ($submittedViolations >= 3 && ($submittedReason === 'normal' || empty($submittedReason))) {
                    $submittedReason = 'tab_violation';
                }

                $submission = QuizSubmission::create([
                    'submission_code' => $data['id'] ?? $data['submission_code'] ?? ('SUB-' . rand(1000, 9999)),
                    'quiz_id'          => $finalQuizId,
                    'user_id'          => $userId,
                    'participant_name' => $participantName ?: ($data['participantName'] ?? $data['participant_name'] ?? 'Peserta'),
                    'participant_email'=> $participantEmail ?: ($data['participantEmail'] ?? $data['participant_email'] ?? ''),
                    'score'            => $initScore,
                    'original_score'   => $initScore,
                    'answers'          => $rawAnswers,
                    'is_locked'        => $data['isLocked'] ?? $data['is_locked'] ?? true,
                    'is_corrected'     => $data['isCorrected'] ?? $data['is_corrected'] ?? false,
                    'admin_notes'      => $data['adminNotes'] ?? $data['admin_notes'] ?? null,
                    'submit_reason'    => $submittedReason,
                    'tab_violations'   => $submittedViolations,
                    'submitted_at'     => now(),
                ]);

                return ['type' => 'created', 'submission' => $submission];
            });
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan jawaban kuis: ' . $e->getMessage(),
            ], 500);
        }

        $submission = $result['submission'];

        if ($result['type'] === 'existing') {
            $existing  = $submission;
            $oldScore  = $existing->score;
            $isManualGrading = auth()->check() && in_array(auth()->user()->role, ['admin', 'super_admin']);
            $newScore = $isManualGrading && isset($data['score'])
                ? (int)$data['score']
                : ($hasServerQuestions ? $finalScoreToSave : (isset($data['score']) ? (int)$data['score'] : $existing->score));

            if ($existing->original_score === null) {
                $existing->original_score = $oldScore;
            }

            $submittedReason     = $data['submitReason'] ?? $data['submit_reason'] ?? $existing->submit_reason;
            $submittedViolations = (int)($data['tabViolations'] ?? $data['tab_violations'] ?? $existing->tab_violations);
            if ($submittedViolations >= 3 && ($submittedReason === 'normal' || empty($submittedReason))) {
                $submittedReason = 'tab_violation';
            }

            $existing->update([
                'score'          => $newScore,
                'answers'        => $rawAnswers ?: $existing->answers,
                'is_locked'      => $data['isLocked'] ?? $data['is_locked'] ?? true,
                'is_corrected'   => $data['isCorrected'] ?? $data['is_corrected'] ?? $existing->is_corrected,
                'admin_notes'    => $data['adminNotes'] ?? $data['admin_notes'] ?? $existing->admin_notes,
                'submit_reason'  => $submittedReason,
                'tab_violations' => $submittedViolations,
                'submitted_at'   => now(),
            ]);

            if (auth()->check() && in_array(auth()->user()->role, ['admin', 'super_admin']) && $oldScore !== $newScore) {
                try {
                    if (\Illuminate\Support\Facades\Schema::hasTable('quiz_submission_corrections')) {
                        \App\Models\QuizSubmissionCorrection::create([
                            'quiz_submission_id' => $existing->id,
                            'admin_id'           => auth()->id(),
                            'old_score'          => $oldScore,
                            'new_score'          => $newScore,
                            'question_scores'    => $data['questionScores'] ?? null,
                            'notes'              => $data['adminNotes'] ?? $data['admin_notes'] ?? 'Koreksi nilai oleh administrator',
                        ]);
                    }
                } catch (\Throwable $corEx) {
                    \Illuminate\Support\Facades\Log::warning('Gagal mencatat audit log koreksi kuis (store existing): ' . $corEx->getMessage());
                }
            }

            $existing->load('quiz', 'user', 'corrections');
            return response()->json($this->formatSubmission($existing), 200);
        }

        if (auth()->check() && in_array(auth()->user()->role, ['admin', 'super_admin']) && ($submission->is_corrected || isset($data['score']))) {
            try {
                if (\Illuminate\Support\Facades\Schema::hasTable('quiz_submission_corrections')) {
                    \App\Models\QuizSubmissionCorrection::create([
                        'quiz_submission_id' => $submission->id,
                        'admin_id'           => auth()->id(),
                        'old_score'          => 0,
                        'new_score'          => $submission->score,
                        'question_scores'    => $data['questionScores'] ?? null,
                        'notes'              => $data['adminNotes'] ?? $data['admin_notes'] ?? 'Input nilai langsung oleh administrator untuk peserta',
                    ]);
                }
            } catch (\Throwable $corEx) {
                \Illuminate\Support\Facades\Log::warning('Gagal mencatat audit log koreksi kuis (store created): ' . $corEx->getMessage());
            }
        }

        $submission->load('quiz', 'user', 'corrections');
        return response()->json($this->formatSubmission($submission), 201);
    }

    public function update(Request $request, $id)
    {
        try {
            $data = $request->all();

            // 1. Cari submission berdasarkan:
            // a. Primary key id atau submission_code
            $sub = QuizSubmission::where('id', $id)
                ->orWhere('submission_code', $id)
                ->first();

            // b. Jika tidak ketemu dari $id (misalnya $id berupa string temporary dari UI like SUB-MANUAL-USR-123),
            // coba cari berdasarkan kombinasi quiz_id + user_id atau email jika tersedia
            $quizIdentifier = $request->route('quizId') ?: ($data['quizId'] ?? $data['quiz_id'] ?? null);
            $userId = $data['user_id'] ?? $data['userId'] ?? null;
            if (!$userId && !empty($data['participantId'])) {
                $cleaned = preg_replace('/[^0-9]/', '', (string)$data['participantId']);
                if (!empty($cleaned)) {
                    $userId = (int)$cleaned;
                }
            }

            if (!$sub && $quizIdentifier) {
                $quizObj = Quiz::where('id', $quizIdentifier)
                    ->orWhere('quiz_code', $quizIdentifier)
                    ->orWhere('link_code', $quizIdentifier)
                    ->first();
                $quizDbId = $quizObj ? $quizObj->id : $quizIdentifier;

                if ($userId) {
                    $sub = QuizSubmission::where('quiz_id', $quizDbId)
                        ->where('user_id', $userId)
                        ->first();
                }

                if (!$sub && !empty($data['participantEmail'] ?? $data['participant_email'] ?? null)) {
                    $email = trim($data['participantEmail'] ?? $data['participant_email']);
                    $sub = QuizSubmission::where('quiz_id', $quizDbId)
                        ->where('participant_email', $email)
                        ->first();
                }
            }

            // 2. Jika data submission belum ada (peserta belum submit kuis secara online),
            // delegasikan langsung ke pembuatan submission baru (store) secara mulus
            if (!$sub) {
                $adminUser = auth('sanctum')->user() ?: auth()->user();
                $isAdmin = $adminUser && in_array($adminUser->role, ['admin', 'super_admin']);
                if ($isAdmin) {
                    // Pastikan route/payload quizId terisi agar store() dapat mengeksekusi
                    if ($quizIdentifier && !$request->route('quizId')) {
                        $request->route()->setParameter('quizId', $quizIdentifier);
                    }
                    return $this->store($request);
                }
                return response()->json([
                    'status' => 'error',
                    'message' => 'Data submission kuis tidak ditemukan.'
                ], 404);
            }

            // 3. Update data submission secara atomik & aman
            $rawAnswers = is_array($sub->answers) ? $sub->answers : (is_string($sub->answers) ? json_decode($sub->answers, true) : []);
            if (!is_array($rawAnswers)) $rawAnswers = [];

            if (isset($data['answers']) && is_array($data['answers'])) {
                $rawAnswers = array_merge($rawAnswers, $data['answers']);
            }
            if (isset($data['questionScores'])) {
                $rawAnswers['_questionScores'] = $data['questionScores'];
            }
            if (isset($data['questionFeedbacks'])) {
                $rawAnswers['_questionFeedbacks'] = $data['questionFeedbacks'];
            }

            $oldScore = $sub->score;
            $newScore = isset($data['score']) ? (int)$data['score'] : $sub->score;

            if ($sub->original_score === null) {
                $sub->original_score = $oldScore;
            }

            $sub->update([
                'score' => $newScore,
                'answers' => $rawAnswers,
                'is_locked' => $data['isLocked'] ?? $data['is_locked'] ?? $sub->is_locked,
                'is_corrected' => true,
                'admin_notes' => $data['adminNotes'] ?? $data['admin_notes'] ?? $sub->admin_notes,
            ]);

            // 4. Catat riwayat koreksi nilai jika tabel audit tersedia (dijamin aman dari kegagalan foreign key)
            try {
                $adminUser = auth('sanctum')->user() ?: auth()->user();
                $adminId = $adminUser ? $adminUser->id : null;

                if (\Illuminate\Support\Facades\Schema::hasTable('quiz_submission_corrections')) {
                    \App\Models\QuizSubmissionCorrection::create([
                        'quiz_submission_id' => $sub->id,
                        'admin_id' => $adminId,
                        'old_score' => $oldScore,
                        'new_score' => $newScore,
                        'question_scores' => $data['questionScores'] ?? null,
                        'notes' => $data['adminNotes'] ?? $data['admin_notes'] ?? 'Koreksi nilai oleh administrator',
                    ]);
                }
            } catch (\Throwable $corEx) {
                \Illuminate\Support\Facades\Log::warning('Gagal mencatat audit log koreksi kuis: ' . $corEx->getMessage());
            }

            $sub->load('quiz', 'user', 'corrections');
            return response()->json($this->formatSubmission($sub));
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan hasil koreksi kuis: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $user = auth('sanctum')->user() ?: auth()->user();
        if ($user && $user->role !== 'super_admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Admin Utama yang berwenang untuk me-reset lembar jawaban kuis peserta.'
            ], 403);
        }

        $sub = QuizSubmission::where('id', $id)->orWhere('submission_code', $id)->firstOrFail();
        $participantName = $sub->participant_name;
        $quizTitle = $sub->quiz ? $sub->quiz->title : 'Kuis';

        \App\Models\QuizSubmissionCorrection::where('quiz_submission_id', $sub->id)->delete();
        \App\Models\QuizGradeRequest::where('submission_id', $sub->id)->delete();

        $sub->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Hasil kuis '{$quizTitle}' untuk {$participantName} berhasil di-reset. Peserta dapat mengerjakan ulang kuis tersebut."
        ], 200);
    }

    // Grade Requests
    public function getGradeRequests()
    {
        $requests = QuizGradeRequest::orderBy('id', 'desc')->get();
        return response()->json($requests);
    }

    public function storeGradeRequest(Request $request)
    {
        $data = $request->all();
        $item = QuizGradeRequest::create([
            'request_code' => $data['id'] ?? ('REQ-' . rand(1000, 9999)),
            'submission_id' => $data['submission_id'] ?? null,
            'quiz_id' => $data['quiz_id'] ?? null,
            'quiz_title' => $data['quizTitle'] ?? $data['quiz_title'] ?? '',
            'participant_id' => $data['participantId'] ?? $data['participant_id'] ?? '',
            'participant_name' => $data['participantName'] ?? $data['participant_name'] ?? '',
            'requested_by' => $data['requestedBy'] ?? $data['requested_by'] ?? 'Panitia',
            'request_type' => $data['requestType'] ?? 'edit_score',
            'reason' => $data['reason'] ?? '',
            'new_score_requested' => $data['newScoreRequested'] ?? 0,
            'status' => $data['status'] ?? 'pending',
        ]);
        return response()->json($item, 201);
    }

    public function updateGradeRequest(Request $request, $id)
    {
        $item = QuizGradeRequest::where('id', $id)->orWhere('request_code', $id)->firstOrFail();
        $item->update($request->only(['status']));
        return response()->json($item, 200);
    }

    public function destroyGradeRequest($id)
    {
        $item = QuizGradeRequest::where('id', $id)->orWhere('request_code', $id)->firstOrFail();
        $item->delete();
        return response()->json(['message' => 'Grade request deleted successfully'], 200);
    }

    /**
     * Import Scores via 2-Sheet Excel / JSON payload.
     */
    public function importScores(Request $request, $quizId)
    {
        $quiz = Quiz::where('id', $quizId)->orWhere('quiz_code', $quizId)->firstOrFail();
        $classId = $request->input('class_id');
        $rows = $request->input('rows', []);

        $currentUser = auth()->user();
        if ($currentUser && $currentUser->role === 'admin') {
            $accessible = $currentUser->managedClasses()->pluck('classes.id')->all();
            if ($classId && !in_array((int)$classId, $accessible)) {
                return response()->json(['status' => 'error', 'message' => 'Anda tidak memiliki hak import di kelas ini.'], 403);
            }
        }

        $imported = 0;
        $updated = 0;
        $failed = 0;
        $errors = [];

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            foreach ($rows as $idx => $row) {
                $email = trim($row['email'] ?? '');
                $qrToken = trim($row['qr_token'] ?? $row['user_qr_token'] ?? '');
                $score = isset($row['score']) ? (int)$row['score'] : null;
                $notes = $row['notes'] ?? 'Import nilai Excel';
                $qScores = $row['question_scores'] ?? null;

                if ($score === null || $score < 0 || $score > 100) {
                    $failed++;
                    $errors[] = "Baris " . ($idx + 1) . ": Skor tidak valid ({$score}).";
                    continue;
                }

                $user = null;
                if ($email) {
                    $user = \App\Models\User::where('email', $email)->first();
                }
                if (!$user && $qrToken) {
                    $user = \App\Models\User::where('user_qr_token', $qrToken)->first();
                }

                if (!$user) {
                    $failed++;
                    $errors[] = "Baris " . ($idx + 1) . ": Peserta ({$email} / {$qrToken}) tidak ditemukan.";
                    continue;
                }

                if ($classId && $user->class_id != $classId) {
                    $failed++;
                    $errors[] = "Baris " . ($idx + 1) . ": Peserta ({$user->name}) bukan anggota kelas ini.";
                    continue;
                }

                $existing = QuizSubmission::where('quiz_id', $quiz->id)->where('user_id', $user->id)->first();
                if ($existing) {
                    $oldScore = $existing->score;
                    if ($existing->original_score === null) {
                        $existing->original_score = $oldScore;
                    }
                    $existing->update([
                        'score' => $score,
                        'is_corrected' => true,
                        'admin_notes' => $notes,
                    ]);

                    $adminUser = auth('sanctum')->user() ?: auth()->user();
                    \App\Models\QuizSubmissionCorrection::create([
                        'quiz_submission_id' => $existing->id,
                        'admin_id' => $adminUser ? $adminUser->id : null,
                        'old_score' => $oldScore,
                        'new_score' => $score,
                        'question_scores' => $qScores,
                        'notes' => $notes,
                    ]);
                    $updated++;
                } else {
                    QuizSubmission::create([
                        'submission_code' => 'SUB-IMP-' . rand(1000, 9999),
                        'quiz_id' => $quiz->id,
                        'user_id' => $user->id,
                        'participant_name' => $user->name,
                        'participant_email' => $user->email,
                        'score' => $score,
                        'original_score' => $score,
                        'answers' => $qScores ? ['_imported' => true, '_questionScores' => $qScores] : ['_imported' => true],
                        'is_locked' => true,
                        'is_corrected' => false,
                        'admin_notes' => $notes,
                        'submit_reason' => 'import',
                        'submitted_at' => now(),
                    ]);
                    $imported++;
                }
            }
            \Illuminate\Support\Facades\DB::commit();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['status' => 'error', 'message' => 'Gagal memproses import: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Import nilai selesai! {$imported} baru dibuat, {$updated} diperbarui, {$failed} gagal.",
            'data' => [
                'imported' => $imported,
                'updated' => $updated,
                'failed' => $failed,
                'errors' => $errors,
            ]
        ]);
    }

    /**
     * Revert score back to original_score.
     */
    public function revertToOriginal($id)
    {
        $sub = QuizSubmission::where('id', $id)->orWhere('submission_code', $id)->firstOrFail();
        if ($sub->original_score === null) {
            return response()->json(['status' => 'error', 'message' => 'Nilai asli tidak tersedia.'], 400);
        }

        $oldScore = $sub->score;
        $sub->update([
            'score' => $sub->original_score,
            'is_corrected' => false,
            'admin_notes' => 'Dikembalikan ke nilai asli ujian',
        ]);

        $adminUser = auth('sanctum')->user() ?: auth()->user();
        \App\Models\QuizSubmissionCorrection::create([
            'quiz_submission_id' => $sub->id,
            'admin_id' => $adminUser ? $adminUser->id : null,
            'old_score' => $oldScore,
            'new_score' => $sub->original_score,
            'notes' => 'Reset ke nilai asli peserta',
        ]);

        $sub->load('quiz', 'user', 'corrections');
        return response()->json([
            'status' => 'success',
            'message' => 'Nilai berhasil dikembalikan ke nilai asli.',
            'data' => $this->formatSubmission($sub),
        ]);
    }
}