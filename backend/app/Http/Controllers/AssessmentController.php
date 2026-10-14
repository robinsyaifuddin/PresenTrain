<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssessmentController extends Controller
{
    /**
     * Helper to compute final score and status based on LK1 / Basic Training formula
     * NA = (Afektif x 50%) + (Kognitif x 30%) + (Psikomotorik x 20%)
     */
    private function computeGrade($afektif, $kognitif, $psikomotorik)
    {
        $na = round(($afektif * 0.5) + ($kognitif * 0.3) + ($psikomotorik * 0.2), 1);
        $status = 'Lulus';
        $predicate = 'Baik Sekali';

        if ($na < 60) {
            $status = 'Tidak Lulus';
            $predicate = 'Kurang';
        } elseif ($na < 70) {
            $status = 'Perbaikan';
            $predicate = 'Cukup';
        } elseif ($na < 80) {
            $status = 'Lulus';
            $predicate = 'Baik';
        } else {
            $status = 'Lulus';
            $predicate = 'Baik Sekali';
        }

        return [
            'nilai_akhir' => $na,
            'status' => $status,
            'predicate' => $predicate,
        ];
    }

    /**
     * Resolve TrainingSession ID from numeric id or string code (e.g. SES-01)
     */
    private function resolveSessionId($rawSessionId)
    {
        if (!$rawSessionId) return [null, null];

        $sessionKey = (string)$rawSessionId;
        $dbSessionId = null;

        if (is_numeric($rawSessionId)) {
            $dbSession = TrainingSession::find($rawSessionId);
            if ($dbSession) {
                $dbSessionId = $dbSession->id;
                $sessionKey = $dbSession->session_code ?: (string)$dbSession->id;
            }
        } else {
            $dbSession = TrainingSession::where('session_code', $sessionKey)
                ->orWhere('id', str_replace('SES-', '', $sessionKey))
                ->first();
            if ($dbSession) {
                $dbSessionId = $dbSession->id;
            }
        }

        return [$dbSessionId, $sessionKey];
    }

    public function index(Request $request)
    {
        $sessionId = $request->get('session_id') ?? $request->get('sessionId') ?? $request->get('training_session_id') ?? $request->get('session_key');
        
        // 1. If specific session is requested
        if ($sessionId && $sessionId !== 'ALL' && $sessionId !== 'all') {
            [$dbSessionId, $sessionKey] = $this->resolveSessionId($sessionId);

            $query = Assessment::query();
            $query->where(function ($q) use ($dbSessionId, $sessionKey, $sessionId) {
                $q->where('session_key', $sessionKey)
                  ->orWhere('session_key', (string)$sessionId);
                if ($dbSessionId) {
                    $q->orWhere('training_session_id', $dbSessionId);
                }
            });

            $assessments = $query->get();
            $result = [];
            foreach ($assessments as $a) {
                $key = $a->participant_id;
                $result[$key] = [
                    'id' => $a->id,
                    'participantId' => $a->participant_id,
                    'sessionId' => $a->session_key ?: ($a->training_session_id ? 'SES-' . $a->training_session_id : null),
                    'trainingSessionId' => $a->training_session_id,
                    'kognitif' => (int)$a->kognitif,
                    'afektif' => (int)$a->afektif,
                    'psikomotorik' => (int)$a->psikomotorik,
                    'nilaiAkhir' => (float)$a->nilai_akhir,
                    'status' => $a->status,
                    'violations' => $a->violations ?: [],
                    'contributions' => $a->contributions ?: [],
                    'notes' => $a->notes ?: '',
                ];
            }

            if ($request->get('format') === 'list') {
                return response()->json(array_values($result));
            }

            return response()->json($result);
        }

        // 2. Return all assessments grouped by participant with sessions breakdown
        $all = Assessment::all();
        $grouped = [];

        foreach ($all as $a) {
            $pId = $a->participant_id;
            if (!$pId) continue;

            if (!isset($grouped[$pId])) {
                $grouped[$pId] = [
                    'global' => null,
                    'sessions' => []
                ];
            }

            $item = [
                'id' => $a->id,
                'participantId' => $a->participant_id,
                'sessionId' => $a->session_key ?: ($a->training_session_id ? 'SES-' . $a->training_session_id : null),
                'trainingSessionId' => $a->training_session_id,
                'kognitif' => (int)$a->kognitif,
                'afektif' => (int)$a->afektif,
                'psikomotorik' => (int)$a->psikomotorik,
                'nilaiAkhir' => (float)$a->nilai_akhir,
                'status' => $a->status,
                'violations' => $a->violations ?: [],
                'contributions' => $a->contributions ?: [],
                'notes' => $a->notes ?: '',
            ];

            if ($a->session_key || $a->training_session_id) {
                $sKey = $a->session_key ?: 'SES-' . $a->training_session_id;
                $grouped[$pId]['sessions'][$sKey] = $item;
            } else {
                $grouped[$pId]['global'] = $item;
            }
        }

        $result = [];
        foreach ($grouped as $pId => $data) {
            $global = $data['global'];
            $sessions = $data['sessions'];

            if ($global) {
                $resItem = $global;
                $resItem['sessions'] = $sessions;
                $result[$pId] = $resItem;
            } else {
                // If only session assessments exist, synthesize global summary
                $count = count($sessions);
                $sumAfektif = 0;
                $sumKognitif = 0;
                $sumPsiko = 0;
                $allViolations = [];
                $allContributions = [];
                $combinedNotes = [];

                foreach ($sessions as $s) {
                    $sumAfektif += $s['afektif'];
                    $sumKognitif += $s['kognitif'];
                    $sumPsiko += $s['psikomotorik'];
                    if (!empty($s['violations'])) {
                        $allViolations = array_merge($allViolations, $s['violations']);
                    }
                    if (!empty($s['contributions'])) {
                        $allContributions = array_merge($allContributions, $s['contributions']);
                    }
                    if (!empty($s['notes'])) {
                        $combinedNotes[] = $s['notes'];
                    }
                }

                $avgAfektif = $count > 0 ? round($sumAfektif / $count) : 100;
                $avgKognitif = $count > 0 ? round($sumKognitif / $count) : 75;
                $avgPsiko = $count > 0 ? round($sumPsiko / $count) : 50;
                $grade = $this->computeGrade($avgAfektif, $avgKognitif, $avgPsiko);

                $result[$pId] = [
                    'id' => null,
                    'participantId' => $pId,
                    'kognitif' => (int)$avgKognitif,
                    'afektif' => (int)$avgAfektif,
                    'psikomotorik' => (int)$avgPsiko,
                    'nilaiAkhir' => $grade['nilai_akhir'],
                    'status' => $grade['status'],
                    'violations' => $allViolations,
                    'contributions' => $allContributions,
                    'notes' => implode("\n", $combinedNotes),
                    'sessions' => $sessions,
                ];
            }
        }

        if ($request->get('format') === 'list') {
            return response()->json(array_values($result));
        }

        return response()->json($result);
    }

    public function show($participantId)
    {
        $a = Assessment::where('participant_id', $participantId)
            ->whereNull('session_key')
            ->first();

        if (!$a) {
            $a = Assessment::where('participant_id', $participantId)->first();
        }

        if (!$a) {
            // ⛔ TIDAK BOLEH return data fiktif/hardcoded!
            // Return 404 yang jelas agar frontend tahu data belum ada
            return response()->json([
                'status'  => 'not_found',
                'message' => 'Data penilaian untuk peserta ini belum diinput.',
            ], 404);
        }

        // Also fetch any session assessments for this participant
        $sessionAssessments = Assessment::where('participant_id', $participantId)
            ->whereNotNull('session_key')
            ->get();

        $sessions = [];
        foreach ($sessionAssessments as $sa) {
            $sKey = $sa->session_key ?: 'SES-' . $sa->training_session_id;
            $sessions[$sKey] = [
                'id'           => $sa->id,
                'sessionId'    => $sKey,
                'afektif'      => (int)$sa->afektif,
                'kognitif'     => (int)$sa->kognitif,
                'psikomotorik' => (int)$sa->psikomotorik,
                'nilaiAkhir'   => (float)$sa->nilai_akhir,
                'status'       => $sa->status,
                'violations'   => $sa->violations ?: [],
                'contributions'=> $sa->contributions ?: [],
                'notes'        => $sa->notes ?: '',
            ];
        }

        return response()->json([
            'id'           => $a->id,
            'participantId'=> $a->participant_id,
            'kognitif'     => (int)$a->kognitif,
            'afektif'      => (int)$a->afektif,
            'psikomotorik' => (int)$a->psikomotorik,
            'nilaiAkhir'   => (float)$a->nilai_akhir,
            'status'       => $a->status,
            'violations'   => $a->violations ?: [],
            'contributions'=> $a->contributions ?: [],
            'notes'        => $a->notes ?: '',
            'sessions'     => $sessions,
        ]);
    }

    public function store(Request $request)
    {
        // Support batch storing
        if ($request->has('items') && is_array($request->input('items'))) {
            $results = [];
            foreach ($request->input('items') as $item) {
                $subRequest = new Request($item);
                $res = $this->storeSingle($subRequest);
                $results[] = $res;
            }
            return response()->json(['message' => 'Batch synced', 'count' => count($results), 'data' => $results], 200);
        }

        return response()->json($this->storeSingle($request), 201);
    }

    private function storeSingle(Request $request)
    {
        $data = $request->all();
        $participantId = $data['participantId'] ?? $data['participant_id'] ?? null;
        if (!$participantId) {
            abort(422, 'participantId required');
        }

        $rawSessionId = $data['sessionId'] ?? $data['session_id'] ?? $data['session_key'] ?? $data['training_session_id'] ?? null;
        [$dbSessionId, $sessionKey] = $this->resolveSessionId($rawSessionId);

        // RULE: Penilaian hanya boleh diisi pada sesi "Berlangsung"
        $currentUser = auth()->user();
        if ($dbSessionId) {
            $sess = TrainingSession::find($dbSessionId);
            if ($sess && $sess->status !== 'Berlangsung' && !($currentUser && $currentUser->role === 'super_admin')) {
                abort(422, "Penilaian hanya dapat diisi pada sesi yang berstatus 'Berlangsung'! Status sesi saat ini: '{$sess->status}'.");
            }
        }

        $userId = $data['user_id'] ?? $data['userId'] ?? null;
        if (!$userId && is_numeric(str_replace('USR-', '', $participantId))) {
            $userId = (int)str_replace('USR-', '', $participantId);
        }

        // RULE: Administrator hanya bisa menilai peserta dari kelas yang dipegangnya
        if ($currentUser && $currentUser->role === 'admin' && $userId) {
            $targetUser = \App\Models\User::find($userId);
            if ($targetUser) {
                $accessibleClassIds = $currentUser->managedClasses()->pluck('classes.id')->all();
                if ($targetUser->class_id === null || !in_array($targetUser->class_id, $accessibleClassIds)) {
                    abort(403, "Anda tidak memiliki hak akses penilaian untuk peserta di luar kelas yang Anda kelola.");
                }
            }
        }

        $violations       = $data['violations'] ?? [];
        $contributions    = $data['contributions'] ?? [];
        $notes            = $data['notes'] ?? $data['qualitativeNote'] ?? null;

        $violationDeduction = 0;
        if (is_array($violations)) {
            foreach ($violations as $v) {
                $violationDeduction += abs($v['points'] ?? 1);
            }
        }

        $contributionBonus = 0;
        if (is_array($contributions)) {
            foreach ($contributions as $c) {
                $contributionBonus += abs($c['points'] ?? 1);
            }
        }

        $afektif = isset($data['afektif']) && $data['afektif'] !== null && $data['afektif'] !== ''
            ? (int)$data['afektif']
            : max(0, min(100, 100 - $violationDeduction));

        $kognitif = isset($data['kognitif']) && $data['kognitif'] !== null && $data['kognitif'] !== ''
            ? (int)$data['kognitif']
            : 75;

        $psikomotorik = isset($data['psikomotorik']) && $data['psikomotorik'] !== null && $data['psikomotorik'] !== ''
            ? (int)$data['psikomotorik']
            : max(0, min(100, 50 + $contributionBonus));

        $grade      = $this->computeGrade($afektif, $kognitif, $psikomotorik);
        $nilaiAkhir = $data['nilaiAkhir'] ?? $data['nilai_akhir'] ?? $grade['nilai_akhir'];
        $status     = $data['status'] ?? $grade['status'];

        // Matching condition: participant_id + session_key
        $condition = ['participant_id' => $participantId];
        $condition['session_key'] = $sessionKey ?: null;

        // =========================================================================
        // ATOMIC TRANSACTION: updateOrCreate + recalculateGlobal dalam satu transaksi
        // Mencegah race condition jika 2 admin menilai peserta berbeda pada sesi yang
        // sama secara bersamaan sehingga recalculation global tidak saling menimpa
        // =========================================================================
        try {
            $assessment = DB::transaction(function () use (
                $condition, $data, $dbSessionId, $userId, $afektif, $kognitif,
                $psikomotorik, $nilaiAkhir, $status, $violations, $contributions, $notes, $participantId
            ) {
                $assessment = Assessment::lockForUpdate()
                    ->where($condition)
                    ->first();

                $assessmentData = [
                    'training_id'         => $data['training_id'] ?? null,
                    'training_session_id' => $dbSessionId,
                    'user_id'             => $userId,
                    'kognitif'            => $kognitif,
                    'afektif'             => $afektif,
                    'psikomotorik'        => $psikomotorik,
                    'nilai_akhir'         => $nilaiAkhir,
                    'status'              => $status,
                    'violations'          => $violations,
                    'contributions'       => (function() use ($contributions, $violations) {
                        $con = is_array($contributions) ? $contributions : [];
                        // Calculate afektif_1..5 from violations
                        if (is_array($violations)) {
                            $a1 = 0; $a2 = 0; $a3 = 0; $a4 = 0; $a5 = 0;
                            foreach ($violations as $v) {
                                $sym = strtoupper(trim((string)($v['symbol'] ?? '')));
                                $pts = abs((int)($v['points'] ?? 1));
                                if ($sym === 'A1' || str_contains($sym, 'A1')) $a1 += $pts;
                                elseif ($sym === 'A2' || str_contains($sym, 'A2')) $a2 += $pts;
                                elseif ($sym === 'A3' || str_contains($sym, 'A3')) $a3 += $pts;
                                elseif ($sym === 'A4' || str_contains($sym, 'A4')) $a4 += $pts;
                                elseif ($sym === 'A5' || str_contains($sym, 'A5')) $a5 += $pts;
                                else {
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
                        // Calculate psiko_1..5 from contributions list
                        $conList = array_is_list($con) ? $con : ($con['contributions'] ?? []);
                        if (!empty($conList) && is_array($conList)) {
                            $p1 = 0; $p2 = 0; $p3 = 0; $p4 = 0; $p5 = 0;
                            foreach ($conList as $c) {
                                $sym = strtoupper(trim((string)($c['symbol'] ?? '')));
                                $pts = abs((int)($c['points'] ?? 1));
                                if ($sym === 'P1' || str_contains($sym, 'P1')) $p1 += $pts;
                                elseif ($sym === 'P2' || str_contains($sym, 'P2')) $p2 += $pts;
                                elseif ($sym === 'P3' || str_contains($sym, 'P3')) $p3 += $pts;
                                elseif ($sym === 'P4' || str_contains($sym, 'P4')) $p4 += $pts;
                                elseif ($sym === 'P5' || str_contains($sym, 'P5')) $p5 += $pts;
                                else {
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
                        return $con;
                    })(),
                    'notes'               => $notes,
                ];

                if ($assessment) {
                    $assessment->update($assessmentData);
                } else {
                    $assessment = Assessment::create(array_merge($condition, $assessmentData));
                }

                // Jika ini session assessment, re-aggregate global (dalam transaksi yang sama)
                if ($condition['session_key']) {
                    $this->recalculateGlobalAssessment($participantId, $userId);
                }

                return $assessment;
            });
        } catch (\Throwable $e) {
            abort(500, 'Gagal menyimpan penilaian: ' . $e->getMessage());
        }

        // Audit Log Penilaian Peserta
        $participantUser = $userId ? User::find($userId) : null;
        $participantName = $participantUser?->name ?? "Peserta ({$participantId})";
        $sessionInfo = $sessionKey ? " pada {$sessionKey}" : " (Global)";

        \App\Services\AuditLogger::log(
            action: 'UPDATE',
            module: 'Penilaian',
            description: "Menginput/memperbarui penilaian untuk {$participantName}{$sessionInfo} (Nilai Akhir: {$nilaiAkhir}, Status: {$status})",
            status: 'SUCCESS',
            properties: [
                'participant_id' => $participantId,
                'user_id' => $userId,
                'session_key' => $sessionKey,
                'afektif' => $afektif,
                'kognitif' => $kognitif,
                'psikomotorik' => $psikomotorik,
                'nilai_akhir' => $nilaiAkhir,
                'status' => $status
            ]
        );

        return $assessment;
    }

    /**
     * Recalculates the global assessment record by averaging all session assessments
     */
    private function recalculateGlobalAssessment($participantId, $userId = null)
    {
        $sessionAssessments = Assessment::where('participant_id', $participantId)
            ->whereNotNull('session_key')
            ->get();

        if ($sessionAssessments->isEmpty()) return;

        $count = $sessionAssessments->count();
        $sumAfektif = 0;
        $sumKognitif = 0;
        $sumPsiko = 0;
        $allViolations = [];
        $allContributions = [];

        foreach ($sessionAssessments as $sa) {
            $sumAfektif += $sa->afektif;
            $sumKognitif += $sa->kognitif;
            $sumPsiko += $sa->psikomotorik;
            if (is_array($sa->violations)) {
                $allViolations = array_merge($allViolations, $sa->violations);
            }
            if (is_array($sa->contributions)) {
                $allContributions = array_merge($allContributions, $sa->contributions);
            }
        }

        $avgAfektif = round($sumAfektif / $count);
        $avgKognitif = round($sumKognitif / $count);
        $avgPsiko = round($sumPsiko / $count);
        $grade = $this->computeGrade($avgAfektif, $avgKognitif, $avgPsiko);

        // Deduplicate violations and contributions by ID if any
        $uniqueViolations = [];
        foreach ($allViolations as $v) {
            $vId = $v['id'] ?? null;
            if ($vId) $uniqueViolations[$vId] = $v;
            else $uniqueViolations[] = $v;
        }

        $uniqueContributions = [];
        foreach ($allContributions as $c) {
            $cId = $c['id'] ?? null;
            if ($cId) $uniqueContributions[$cId] = $c;
            else $uniqueContributions[] = $c;
        }

        Assessment::updateOrCreate(
            [
                'participant_id' => $participantId,
                'session_key' => null,
            ],
            [
                'user_id' => $userId,
                'afektif' => $avgAfektif,
                'kognitif' => $avgKognitif,
                'psikomotorik' => $avgPsiko,
                'nilai_akhir' => $grade['nilai_akhir'],
                'status' => $grade['status'],
                'violations' => array_values($uniqueViolations),
                'contributions' => array_values($uniqueContributions),
            ]
        );
    }

    public function update(Request $request, $participantId)
    {
        return response()->json($this->storeSingle($request));
    }

    public function destroy($participantId)
    {
        Assessment::where('participant_id', $participantId)
            ->orWhere('id', $participantId)
            ->delete();

        return response()->json(['message' => 'Assessment deleted'], 200);
    }
}
