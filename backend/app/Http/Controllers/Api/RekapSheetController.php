<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\ClassRoom;
use App\Models\Quiz;
use App\Models\QuizSubmission;
use App\Models\Registration;
use App\Models\RekapAuditLog;
use App\Models\Training;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RekapSheetController extends Controller
{
    /**
     * Get aggregate data formatted like BERKAS BASIC TRAINING.xls
     * Sheets: A1 Screening, A2 Absensi, A3 Aktivitas Forum, A4 Rekapan, A5 Tugas, A6 Nilai Tes Tulis, TOTAL
     */
    public function getRekapData(Request $request)
    {
        $classId = $request->query('class_id'); // null / 'all' or specific class_id
        $training = Training::first();

        // 1. Get Participants
        $userQuery = User::where('role', 'participant')
            ->select('id', 'name', 'email', 'instansi', 'class_id', 'phone', 'status', 'user_qr_token')
            ->orderBy('name', 'asc');

        if ($classId && $classId !== 'all') {
            if ($classId === 'general') {
                $userQuery->whereNull('class_id');
            } else {
                $userQuery->where('class_id', (int)$classId);
            }
        }

        $participants = $userQuery->get();

        // 2. Get Sessions
        $sessions = TrainingSession::orderBy('session_date', 'asc')
            ->orderBy('start_time', 'asc')
            ->get();

        // 3. Get Attendances (Ensure every participant has a registration record for active training)
        $trainingId = $training ? $training->id : (Training::value('id') ?? 1);
        $regIds = Registration::whereIn('user_id', $participants->pluck('id'))->pluck('id', 'user_id');

        // Pastikan setiap user memiliki registration_id agar data absensi presisi
        foreach ($participants as $p) {
            if (!isset($regIds[$p->id])) {
                $newReg = Registration::firstOrCreate(
                    ['user_id' => $p->id, 'training_id' => $trainingId],
                    ['status' => 'active']
                );
                $regIds[$p->id] = $newReg->id;
            }
        }

        $attendances = Attendance::whereIn('registration_id', $regIds->values())->get();

        // Map attendance: [userId_sessionId => status] ('present', 'permission', 'absent')
        $attendanceMap = [];
        $regIdToUser = array_flip($regIds->toArray());
        foreach ($attendances as $att) {
            $uId = $regIdToUser[$att->registration_id] ?? null;
            if ($uId) {
                $st = strtolower(trim((string)$att->status));
                if (in_array($st, ['present', 'hadir', '1'])) {
                    $attendanceMap[$uId . '_' . $att->training_session_id] = 'present';
                } elseif (in_array($st, ['permission', 'izin', 'sakit', 'dispensasi'])) {
                    $attendanceMap[$uId . '_' . $att->training_session_id] = 'permission';
                } else {
                    $attendanceMap[$uId . '_' . $att->training_session_id] = 'absent';
                }
            }
        }

        // 4. Get Quizzes (Pre-test, Mid-test, and Post-test)
        $quizzes = Quiz::whereIn('type', ['pretest', 'pre_test', 'midtest', 'mid_test', 'posttest', 'post_test', 'quiz', 'evaluasi'])->orderBy('id', 'asc')->get();
        $quizSubs = QuizSubmission::whereIn('user_id', $participants->pluck('id'))->get();
        $quizMap = []; // [userId_quizId => score]
        foreach ($quizSubs as $sub) {
            $quizMap[$sub->user_id . '_' . $sub->quiz_id] = $sub->score;
        }

        // 5. Get Assessments
        $assessments = Assessment::whereIn('user_id', $participants->pluck('id'))->get();
        $assessmentMap = []; // [userId_sessionId => assessment] or global
        foreach ($assessments as $ass) {
            // Auto-calculate sub-rubrics afektif_1..5 and psiko_1..5 from violations & contributions
            $con = is_array($ass->contributions) ? $ass->contributions : (json_decode($ass->contributions, true) ?: []);
            $vios = is_array($ass->violations) ? $ass->violations : (json_decode($ass->violations, true) ?: []);

            $hasAfkSub = isset($con['afektif_1']) || isset($con['afektif_2']) || isset($con['afektif_3']) || isset($con['afektif_4']) || isset($con['afektif_5']);
            $hasPsiSub = isset($con['psiko_1']) || isset($con['psiko_2']) || isset($con['psiko_3']) || isset($con['psiko_4']) || isset($con['psiko_5']);

            if (!$hasAfkSub && !empty($vios)) {
                $a1 = 0; $a2 = 0; $a3 = 0; $a4 = 0; $a5 = 0;
                foreach ($vios as $v) {
                    $sym = strtoupper(trim((string)($v['symbol'] ?? '')));
                    $pts = abs((int)($v['points'] ?? 1));
                    if ($sym === 'A1' || str_contains($sym, 'A1')) {
                        $a1 += $pts;
                    } elseif ($sym === 'A2' || str_contains($sym, 'A2')) {
                        $a2 += $pts;
                    } elseif ($sym === 'A3' || str_contains($sym, 'A3')) {
                        $a3 += $pts;
                    } elseif ($sym === 'A4' || str_contains($sym, 'A4')) {
                        $a4 += $pts;
                    } elseif ($sym === 'A5' || str_contains($sym, 'A5')) {
                        $a5 += $pts;
                    } else {
                        // Fallback berdasarkan level poin
                        if ($pts <= 1) $a1 += $pts;
                        elseif ($pts <= 3) $a2 += $pts;
                        else $a3 += $pts;
                    }
                }
                $con['afektif_1'] = $a1;
                $con['afektif_2'] = $a2;
                $con['afektif_3'] = $a3;
                $con['afektif_4'] = $a4;
                $con['afektif_5'] = $a5;
            }

            if (!$hasPsiSub && !empty($con)) {
                // If contributions has list of log items
                $conList = [];
                if (isset($con['contributions']) && is_array($con['contributions'])) {
                    $conList = $con['contributions'];
                } elseif (array_is_list($con)) {
                    $conList = $con;
                }
                if (!empty($conList)) {
                    $p1 = 0; $p2 = 0; $p3 = 0; $p4 = 0; $p5 = 0;
                    foreach ($conList as $c) {
                        $sym = strtoupper(trim((string)($c['symbol'] ?? '')));
                        $pts = abs((int)($c['points'] ?? 1));
                        if ($sym === 'P1' || str_contains($sym, 'P1')) {
                            $p1 += $pts;
                        } elseif ($sym === 'P2' || str_contains($sym, 'P2')) {
                            $p2 += $pts;
                        } elseif ($sym === 'P3' || str_contains($sym, 'P3')) {
                            $p3 += $pts;
                        } elseif ($sym === 'P4' || str_contains($sym, 'P4')) {
                            $p4 += $pts;
                        } elseif ($sym === 'P5' || str_contains($sym, 'P5')) {
                            $p5 += $pts;
                        } else {
                            if ($pts <= 2) $p1 += $pts;
                            elseif ($pts <= 3) $p2 += $pts;
                            else $p3 += $pts;
                        }
                    }
                    $con['psiko_1'] = $p1;
                    $con['psiko_2'] = $p2;
                    $con['psiko_3'] = $p3;
                    $con['psiko_4'] = $p4;
                    $con['psiko_5'] = $p5;
                }
            }

            $ass->contributions = $con;

            if ($ass->training_session_id) {
                $assessmentMap[$ass->user_id . '_' . $ass->training_session_id] = $ass;
            }
            if ($ass->session_key) {
                $cleanKey = str_replace('SES-', '', $ass->session_key);
                $assessmentMap[$ass->user_id . '_' . $ass->session_key] = $ass;
                $assessmentMap[$ass->user_id . '_' . $cleanKey] = $ass;
            }
            if (!$ass->training_session_id && !$ass->session_key) {
                $assessmentMap[$ass->user_id . '_global'] = $ass;
            }
        }

        // 6. Get Classes list for Sheet selector
        $classes = ClassRoom::select('id', 'name', 'code')->orderBy('name', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'training' => $training,
                'classes' => $classes,
                'participants' => $participants,
                'sessions' => $sessions,
                'attendance_map' => $attendanceMap,
                'quizzes' => $quizzes,
                'quiz_map' => $quizMap,
                'assessment_map' => $assessmentMap,
            ]
        ]);
    }

    /**
     * Save single or batch corrections with audit trail
     */
    public function saveCorrections(Request $request)
    {
        $user = auth('sanctum')->user() ?: $request->user() ?: auth()->user();
        $adminId = $user ? $user->id : null;

        $validated = $request->validate([
            'corrections' => 'required|array|min:1',
            'corrections.*.user_id' => 'required|exists:users,id',
            'corrections.*.sheet_name' => 'required|string',
            'corrections.*.field_name' => 'required|string',
            'corrections.*.old_value' => 'nullable',
            'corrections.*.new_value' => 'nullable',
            'corrections.*.session_id' => 'nullable',
            'corrections.*.quiz_id' => 'nullable',
            'corrections.*.reason' => 'nullable|string',
        ]);

        $applied = 0;
        DB::beginTransaction();
        try {
            foreach ($validated['corrections'] as $item) {
                $pUser = User::find($item['user_id']);
                if (!$pUser) continue;

                $classId = $pUser->class_id;
                $sheet = $item['sheet_name'];
                $field = $item['field_name'];
                $oldVal = (string)($item['old_value'] ?? '');
                $newVal = isset($item['new_value']) ? trim((string)$item['new_value']) : '';
                $reason = $item['reason'] ?? 'Koreksi Data Spreadsheet Rekap';

                // Apply update based on sheet / field type
                $trainingId = Training::value('id') ?? 1;

                if ($sheet === 'A2 Absensi') {
                    // Update or insert Attendance
                    $sessId = $item['session_id'] ?? null;
                    if ($sessId) {
                        $reg = Registration::firstOrCreate(
                            ['user_id' => $pUser->id, 'training_id' => $trainingId],
                            ['status' => 'active']
                        );

                        // lockForUpdate: mencegah race condition jika koreksi absensi concurrent
                        $att = Attendance::where('registration_id', $reg->id)
                            ->where('training_session_id', $sessId)
                            ->lockForUpdate()
                            ->first();

                        $statusMap = [
                            '1'          => 'present',
                            'Hadir'      => 'present',
                            'hadir'      => 'present',
                            '0'          => 'absent',
                            'Alpha'      => 'absent',
                            'absent'     => 'absent',
                            'Izin'       => 'permission',
                            'izin'       => 'permission',
                            'Sakit'      => 'permission',
                            'sakit'      => 'permission',
                            'present'    => 'present',
                            'permission' => 'permission'
                        ];

                        $finalStatus = $statusMap[$newVal] ?? 'absent';

                        if ($att) {
                            $att->status = $finalStatus;
                            $att->source = 'rekap_correction';
                            $att->note   = $reason;
                            $att->save();
                        } else {
                            Attendance::create([
                                'registration_id'     => $reg->id,
                                'training_session_id' => $sessId,
                                'status'              => $finalStatus,
                                'source'              => 'rekap_correction',
                                'note'                => $reason,
                            ]);
                        }
                    }
                } elseif ($sheet === 'A6 Nilai Tes Tulis') {
                    // Update or insert Quiz Submission
                    $quizId = $item['quiz_id'] ?? null;
                    if ($quizId) {
                        $sub = QuizSubmission::where('user_id', $pUser->id)
                            ->where('quiz_id', $quizId)
                            ->lockForUpdate()
                            ->first();

                        $scoreNum = $newVal === '' ? 0 : (int)round((float)$newVal);

                        if ($sub) {
                            $sub->score        = $scoreNum;
                            $sub->is_corrected = true;
                            $sub->admin_notes  = $reason;
                            $sub->save();
                        } else {
                            QuizSubmission::create([
                                'submission_code'  => 'SUB-' . strtoupper(uniqid()),
                                'user_id'          => $pUser->id,
                                'participant_name' => $pUser->name,
                                'participant_email'=> $pUser->email,
                                'quiz_id'          => $quizId,
                                'score'            => $scoreNum,
                                'original_score'   => $scoreNum,
                                'is_locked'        => true,
                                'is_corrected'     => true,
                                'admin_notes'      => $reason,
                                'submitted_at'     => now(),
                            ]);
                        }
                    }
                } elseif (in_array($sheet, ['A1 Screening', 'A3 Aktivitas Forum', 'A5 Tugas', 'A4 Rekapan', 'TOTAL'])) {
                    // Update or insert into Assessment
                    $sessId = $item['session_id'] ?? null;
                    $ass = Assessment::where('user_id', $pUser->id);
                    if ($sessId) {
                        $ass->where('training_session_id', $sessId);
                    } else {
                        $ass->whereNull('training_session_id');
                    }
                    $record = $ass->first();

                    if (!$record) {
                        $record = new Assessment();
                        $record->user_id = $pUser->id;
                        $record->participant_id = 'USR-' . $pUser->id;
                        $record->training_id = $trainingId;
                        $record->training_session_id = $sessId;
                        $record->afektif = 0;
                        $record->kognitif = 0;
                        $record->psikomotorik = 0;
                        $record->contributions = [];
                    }

                    if ($field === 'afektif') {
                        $record->afektif = $newVal === '' ? 0 : (int)round((float)$newVal);
                    } elseif ($field === 'kognitif') {
                        $record->kognitif = $newVal === '' ? 0 : (int)round((float)$newVal);
                    } elseif ($field === 'psikomotorik') {
                        $record->psikomotorik = $newVal === '' ? 0 : (int)round((float)$newVal);
                    } elseif ($field === 'notes') {
                        $record->notes = $newVal;
                    } elseif ($field === 'status') {
                        $record->status = $newVal;
                    } else {
                        // Store sub-rubric or custom values inside contributions/metadata json
                        $con = $record->contributions ?: [];

                        if ($newVal === '') {
                            // Kosongkan nilai jika string kosong dikirim
                            unset($con[$field]);
                        } else {
                            $con[$field] = is_numeric($newVal) ? (float)$newVal : $newVal;
                        }

                        // Otomatis hitung jika merupakan sub-rubrik Aktivitas Forum A3
                        if (str_starts_with($field, 'afektif_') || str_starts_with($field, 'psiko_')) {
                            $afk1 = (int)($con['afektif_1'] ?? 0);
                            $afk2 = (int)($con['afektif_2'] ?? 0);
                            $afk3 = (int)($con['afektif_3'] ?? 0);
                            $afk4 = (int)($con['afektif_4'] ?? 0);
                            $afk5 = (int)($con['afektif_5'] ?? 0);
                            $sumAfk = $afk1 + $afk2 + $afk3 + $afk4 + $afk5;
                            $record->afektif = max(0, 100 - $sumAfk);

                            $psi1 = (int)($con['psiko_1'] ?? 0);
                            $psi2 = (int)($con['psiko_2'] ?? 0);
                            $psi3 = (int)($con['psiko_3'] ?? 0);
                            $psi4 = (int)($con['psiko_4'] ?? 0);
                            $psi5 = (int)($con['psiko_5'] ?? 0);
                            $sumPsi = $psi1 + $psi2 + $psi3 + $psi4 + $psi5;
                            $record->psikomotorik = min(100, 50 + $sumPsi);
                        } elseif ($field === 'tugas') {
                            $con['tugas'] = $newVal === '' ? 0 : (float)$newVal;
                        } elseif (str_starts_with($field, 'screening_')) {
                            $hasAnyScr = isset($con['screening_keislaman']) || 
                                         isset($con['screening_kehmi']) || 
                                         isset($con['screening_keindonesiaan']) || 
                                         isset($con['screening_keorganisasian']) || 
                                         isset($con['screening_suplemen']);
                            if ($hasAnyScr) {
                                $sumScr = (float)($con['screening_keislaman'] ?? 0) + 
                                          (float)($con['screening_kehmi'] ?? 0) + 
                                          (float)($con['screening_keindonesiaan'] ?? 0) + 
                                          (float)($con['screening_keorganisasian'] ?? 0) + 
                                          (float)($con['screening_suplemen'] ?? 0);
                                $record->kognitif = (int)round($sumScr / 5);
                            }
                        }

                        $record->contributions = $con;
                    }

                    // Hitung nilai akhir LK1: (Afektif x 50%) + (Kognitif x 30%) + (Psikomotorik x 20%)
                    $afkVal = (float)($record->afektif ?? 0);
                    $kogVal = (float)($record->kognitif ?? 0);
                    $psiVal = (float)($record->psikomotorik ?? 0);
                    $record->nilai_akhir = round(($afkVal * 0.5) + ($kogVal * 0.3) + ($psiVal * 0.2), 1);
                    $record->save();
                }

                // Record Audit Log
                RekapAuditLog::create([
                    'admin_id' => $adminId,
                    'user_id' => $pUser->id,
                    'class_id' => $classId,
                    'sheet_name' => $sheet,
                    'field_name' => $field,
                    'old_value' => $oldVal,
                    'new_value' => $newVal,
                    'reason' => $reason,
                ]);

                $applied++;
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Berhasil menyimpan {$applied} koreksi data dan mencatat log.",
                'data' => [
                    'applied_count' => $applied,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan koreksi data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get correction audit logs
     */
    public function getAuditLogs(Request $request)
    {
        $classId = $request->query('class_id');
        $userId = $request->query('user_id');

        $query = RekapAuditLog::with(['admin:id,name,email,role', 'user:id,name,instansi,class_id', 'classRoom:id,name'])
            ->orderBy('id', 'desc');

        if ($classId && $classId !== 'all') {
            $query->where('class_id', (int)$classId);
        }

        if ($userId) {
            $query->where('user_id', (int)$userId);
        }

        $logs = $query->limit(100)->get();

        return response()->json([
            'status' => 'success',
            'data' => $logs
        ]);
    }
}
