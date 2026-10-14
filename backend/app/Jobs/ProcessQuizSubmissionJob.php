<?php

namespace App\Jobs;

use App\Models\AsyncJobTicket;
use App\Models\Quiz;
use App\Models\QuizSubmission;
use App\Models\QuizSubmissionCorrection;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessQuizSubmissionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 60;
    public $tries = 2;

    protected string $ticketId;
    protected array $data;

    /**
     * Create a new job instance.
     */
    public function __construct(string $ticketId, array $data)
    {
        $this->ticketId = $ticketId;
        $this->data = $data;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $ticket = AsyncJobTicket::find($this->ticketId);
        if (!$ticket) {
            return;
        }

        $ticket->markProcessing('Sedang memvalidasi dan memproses lembar jawaban kuis...', 25);

        try {
            $data = $this->data;
            $quizIdentifier = $data['quizId'] ?? $data['quiz_id'] ?? null;

            $quiz = Quiz::where('id', $quizIdentifier)
                ->orWhere('quiz_code', $quizIdentifier)
                ->orWhere('link_code', $quizIdentifier)
                ->first();

            if (!$quiz) {
                throw new \Exception('Kuis tidak ditemukan dalam sistem.');
            }

            $finalQuizId = $quiz->id;

            $ticket->markProcessing('Menganalisis jawaban dan menghitung skor...', 55);

            // Resolve user_id cleanly
            $userId = $data['user_id'] ?? null;
            if (!$userId && !empty($data['participantId'])) {
                $cleaned = preg_replace('/[^0-9]/', '', (string)$data['participantId']);
                if (!empty($cleaned)) {
                    $userId = (int)$cleaned;
                }
            }
            if (!$userId && !empty($data['participantEmail'])) {
                $userRecord = User::where('email', $data['participantEmail'])->first();
                if ($userRecord) {
                    $userId = $userRecord->id;
                }
            }

            // Prepare answers
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
                        if (\App\Http\Controllers\QuizSubmissionController::isAnswerMatch($userAns, $correct, $q->options ?: [])) {
                            $awarded = $weight;
                        }
                    } elseif ($q->type === 'essay') {
                        // Jika essay, beri bobot jika jawaban terisi substantif
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

            // Gunakan calculatedScore jika tersedia, atau fallback ke score yang dikirim client
            $finalScoreToSave = $hasServerQuestions ? $calculatedScore : (isset($data['score']) ? (int)$data['score'] : 0);

            $participantName = $data['participantName'] ?? $data['participant_name'] ?? null;
            $participantEmail = $data['participantEmail'] ?? $data['participant_email'] ?? null;

            $submission = DB::transaction(function () use ($finalQuizId, $userId, $data, $rawAnswers, $finalScoreToSave, $participantName, $participantEmail) {
                $existing = null;
                if ($userId) {
                    $existing = QuizSubmission::where('quiz_id', $finalQuizId)->where('user_id', $userId)->lockForUpdate()->first();
                }
                if (!$existing && !empty($participantEmail)) {
                    $existing = QuizSubmission::where('quiz_id', $finalQuizId)->where('participant_email', $participantEmail)->lockForUpdate()->first();
                }
                if (!$existing && !empty($participantName) && !in_array(strtolower(trim($participantName)), ['peserta', 'user', 'guest', 'peserta pelatihan', 'admin'])) {
                    $existing = QuizSubmission::where('quiz_id', $finalQuizId)->where('participant_name', $participantName)->lockForUpdate()->first();
                }
                if (!$existing && !empty($data['id'])) {
                    $existing = QuizSubmission::where('submission_code', $data['id'])->lockForUpdate()->first();
                }

                $newScore = $finalScoreToSave;

                if ($existing) {
                    $oldScore = $existing->score;
                    if ($existing->original_score === null) {
                        $existing->original_score = $oldScore;
                    }

                    $existing->update([
                        'score' => $newScore,
                        'answers' => $rawAnswers ?: $existing->answers,
                        'is_locked' => $data['isLocked'] ?? $data['is_locked'] ?? true,
                        'is_corrected' => $data['isCorrected'] ?? $data['is_corrected'] ?? $existing->is_corrected,
                        'admin_notes' => $data['adminNotes'] ?? $data['admin_notes'] ?? $existing->admin_notes,
                        'submit_reason' => $data['submitReason'] ?? $data['submit_reason'] ?? $existing->submit_reason,
                        'tab_violations' => $data['tabViolations'] ?? $data['tab_violations'] ?? $existing->tab_violations,
                        'submitted_at' => now(),
                    ]);

                    return $existing;
                }

                return QuizSubmission::create([
                    'submission_code' => $data['id'] ?? $data['submission_code'] ?? ('SUB-' . rand(1000, 9999)),
                    'quiz_id' => $finalQuizId,
                    'user_id' => $userId,
                    'participant_name' => $data['participantName'] ?? $data['participant_name'] ?? 'Peserta',
                    'participant_email' => $data['participantEmail'] ?? $data['participant_email'] ?? '',
                    'score' => $newScore,
                    'original_score' => $newScore,
                    'answers' => $rawAnswers,
                    'is_locked' => $data['isLocked'] ?? $data['is_locked'] ?? true,
                    'is_corrected' => false,
                    'admin_notes' => $data['adminNotes'] ?? $data['admin_notes'] ?? null,
                    'submit_reason' => $data['submitReason'] ?? $data['submit_reason'] ?? 'normal',
                    'tab_violations' => (int)($data['tabViolations'] ?? $data['tab_violations'] ?? 0),
                    'submitted_at' => now(),
                ]);
            });

            $submissionFormatted = [
                'id' => $submission->submission_code ?: (string)$submission->id,
                'db_id' => $submission->id,
                'submission_code' => $submission->submission_code,
                'quizId' => $quiz->quiz_code ?: (string)$quiz->id,
                'quiz_id' => $quiz->id,
                'quiz_code' => $quiz->quiz_code,
                'participantId' => $submission->user_id ? "USR-{$submission->user_id}" : ($submission->participant_name ?: 'USR-LOCAL'),
                'user_id' => $submission->user_id,
                'participantName' => $submission->participant_name,
                'participant_name' => $submission->participant_name,
                'participantEmail' => $submission->participant_email,
                'participant_email' => $submission->participant_email,
                'score' => (int)$submission->score,
                'originalScore' => $submission->original_score !== null ? (int)$submission->original_score : (int)$submission->score,
                'original_score' => $submission->original_score !== null ? (int)$submission->original_score : (int)$submission->score,
                'submittedAt' => $submission->submitted_at ? $submission->submitted_at->format('d/m/Y H:i') . ' WIB' : now()->format('d/m/Y H:i') . ' WIB',
                'submitted_at' => $submission->submitted_at ? $submission->submitted_at->toIso8601String() : now()->toIso8601String(),
                'isLocked' => (bool)$submission->is_locked,
                'is_locked' => (bool)$submission->is_locked,
                'isCorrected' => (bool)$submission->is_corrected,
                'is_corrected' => (bool)$submission->is_corrected,
                'adminNotes' => $submission->admin_notes,
                'admin_notes' => $submission->admin_notes,
                'submitReason' => $submission->submit_reason ?: 'normal',
                'submit_reason' => $submission->submit_reason ?: 'normal',
                'tabViolations' => (int)($submission->tab_violations ?? 0),
                'tab_violations' => (int)($submission->tab_violations ?? 0),
            ];

            $ticket->markCompleted($submissionFormatted, 'Ujian/Kuis berhasil tersimpan!');

        } catch (\Throwable $e) {
            Log::error('ProcessQuizSubmissionJob Error: ' . $e->getMessage(), [
                'ticket_id' => $this->ticketId,
                'trace' => $e->getTraceAsString(),
            ]);

            $ticket->markFailed($e->getMessage());
        }
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $ticket = AsyncJobTicket::find($this->ticketId);
        if ($ticket) {
            $ticket->markFailed('Gagal memproses lembar kuis: ' . $exception->getMessage());
        }
    }
}
