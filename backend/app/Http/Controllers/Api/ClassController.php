<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassAdmin;
use App\Models\ClassQuizAccess;
use App\Models\ClassRoom;
use App\Models\Quiz;
use App\Models\Training;
use App\Models\TrainingSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClassController extends Controller
{
    /**
     * Get list of classes (filtered by user access).
     */
    public function index(Request $request)
    {
        $user = auth('sanctum')->user() ?: auth()->user();
        $userId = $user ? $user->id : 'guest';
        $userRole = $user ? $user->role : 'guest';
        $cacheKey = "classes_list_{$userRole}_{$userId}";

        // Micro-cache for 15 seconds: drastic reduction of DB load during multiple admins managing classes
        $result = \Illuminate\Support\Facades\Cache::remember($cacheKey, 15, function () use ($user) {
            $query = ClassRoom::withCount(['participants', 'admins']);

            if ($user && $user->role === 'admin') {
                $accessibleIds = $user->managedClasses()->pluck('classes.id')->all();
                $query->whereIn('id', $accessibleIds);
            }

            $classes = $query->orderBy('name', 'asc')->get();

            // Count for Kelas Umum (Participants without class_id)
            $generalCount = User::where('role', 'participant')->whereNull('class_id')->count();

            return [
                'classes' => $classes,
                'general_count' => $generalCount,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $result['classes'],
            'meta' => [
                'general_participants_count' => $result['general_count'],
            ]
        ]);
    }

    /**
     * Store new class (Super Admin only).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:classes,code',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:Aktif,Nonaktif',
        ]);

        if (empty($validated['code'])) {
            $slug = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', Str::slug($validated['name'])), 0, 8));
            $validated['code'] = 'KLS-' . ($slug ?: 'MAIN') . '-' . rand(100, 999);
        }

        $class = ClassRoom::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Kelas berhasil dibuat!',
            'data' => $class->loadCount(['participants', 'admins']),
        ], 201);
    }

    /**
     * Show single class details with members.
     */
    public function show($id)
    {
        $user = auth()->user();

        $formatParticipant = function ($u) {
            $attMap = [];
            if ($u->registrations) {
                foreach ($u->registrations as $reg) {
                    if ($reg->attendances) {
                        foreach ($reg->attendances as $att) {
                            $sess = $att->session;
                            $code = $sess ? ($sess->session_code ?: 'SES-' . $sess->id) : ('SES-' . $att->training_session_id);
                            $scannedAtTime = $att->scanned_at ? ($att->scanned_at instanceof \Carbon\Carbon ? $att->scanned_at : \Carbon\Carbon::parse($att->scanned_at)) : null;
                            $timeFmt = $scannedAtTime ? $scannedAtTime->format('H:i') . ' WIB' : '-';
                            $statusLabel = match($att->status) {
                                'present'    => 'Hadir',
                                'permission' => 'Izin',
                                'absent'     => 'Tidak Hadir',
                                default      => $att->status ?? 'Hadir',
                            };
                            $item = [
                                'present'             => $att->status === 'present',
                                'status'              => $statusLabel,
                                'raw_status'          => $att->status,
                                'note'                => $att->note,
                                'time'                => $timeFmt,
                                'timestamp'           => $scannedAtTime ? $scannedAtTime->toISOString() : null,
                                'source'              => $att->source,
                                'training_session_id' => $att->training_session_id,
                            ];
                            $attMap[$code] = $item;
                            $attMap['SES-' . $att->training_session_id] = $item;
                            $attMap[$att->training_session_id] = $item;
                            $padded = 'SES-' . str_pad($att->training_session_id, 2, '0', STR_PAD_LEFT);
                            $attMap[$padded] = $item;
                        }
                    }
                }
            }
            $u->attendances = $attMap;

            // Pastikan quizSubmissions bebas dari duplikasi kuis per peserta
            if ($u->relationLoaded('quizSubmissions') && $u->quizSubmissions) {
                $u->setRelation('quizSubmissions', $u->quizSubmissions->unique(function ($s) {
                    return (string)($s->quiz_id ?: ($s->quiz ? ($s->quiz->quiz_code ?: $s->quiz->id) : $s->id));
                })->values());
            }

            return $u;
        };

        // Support special virtual 'general' class
        if ($id === 'general' || $id === '0') {
            $participants = User::where('role', 'participant')
                ->whereNull('class_id')
                ->with(['registrations.attendances.session', 'assessment', 'quizSubmissions.quiz'])
                ->orderBy('name', 'asc')
                ->get()
                ->map($formatParticipant);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'id' => null,
                    'code' => 'KELAS-UMUM',
                    'name' => 'Kelas Umum (Default)',
                    'description' => 'Wadah utama peserta pelatihan yang belum dikelompokkan ke dalam kelas khusus.',
                    'status' => 'Aktif',
                    'is_general' => true,
                    'participants_count' => $participants->count(),
                    'participants' => $participants,
                    'admins' => [],
                ]
            ]);
        }

        $class = ClassRoom::with([
            'admins' => function ($q) {
                $q->orderBy('name', 'asc');
            }, 
            'participants' => function ($q) {
                $q->orderBy('name', 'asc');
            },
            'participants.registrations.attendances.session', 
            'participants.assessment', 
            'participants.quizSubmissions.quiz'
        ])->findOrFail($id);

        if ($user && $user->role === 'admin') {
            $isAssigned = $user->managedClasses()->where('classes.id', $id)->exists();
            if (!$isAssigned) {
                return response()->json(['status' => 'error', 'message' => 'Anda tidak memiliki akses ke kelas ini.'], 403);
            }
        }

        if ($class->participants) {
            $class->participants->transform($formatParticipant);
        }

        return response()->json([
            'status' => 'success',
            'data' => $class,
        ]);
    }

    /**
     * Update class details (Super Admin).
     */
    public function update(Request $request, $id)
    {
        $class = ClassRoom::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:classes,code,' . $id,
            'description' => 'nullable|string',
            'status' => 'sometimes|in:Aktif,Nonaktif',
        ]);

        $class->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Data kelas berhasil diperbarui!',
            'data' => $class->loadCount(['participants', 'admins']),
        ]);
    }

    /**
     * Delete class (Super Admin).
     */
    public function destroy($id)
    {
        $class = ClassRoom::findOrFail($id);

        // Reset participants of this class back to Kelas Umum (class_id = null)
        User::where('class_id', $id)->update(['class_id' => null]);

        $class->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Kelas berhasil dihapus. Semua peserta dikembalikan ke Kelas Umum.',
        ]);
    }

    /**
     * Assign or sync administrators to a class (Super Admin).
     */
    public function assignAdmins(Request $request, $id)
    {
        $class = ClassRoom::findOrFail($id);

        $validated = $request->validate([
            'admins' => 'present|array',
            'admins.*.user_id' => 'required|exists:users,id',
            'admins.*.can_manage_attendance' => 'sometimes|boolean',
            'admins.*.can_manage_assessment' => 'sometimes|boolean',
            'admins.*.can_manage_quiz' => 'sometimes|boolean',
        ]);

        $syncData = [];
        foreach ($validated['admins'] as $adminItem) {
            $syncData[$adminItem['user_id']] = [
                'can_manage_attendance' => $adminItem['can_manage_attendance'] ?? true,
                'can_manage_assessment' => $adminItem['can_manage_assessment'] ?? true,
                'can_manage_quiz'       => $adminItem['can_manage_quiz'] ?? true,
            ];
        }

        $class->admins()->sync($syncData);

        return response()->json([
            'status' => 'success',
            'message' => 'Daftar administrator kelas berhasil diperbarui!',
            'data' => $class->load('admins'),
        ]);
    }

    /**
     * Assign classes to a specific administrator (Super Admin).
     */
    public function updateAdminClasses(Request $request, $adminId)
    {
        $admin = User::where('id', $adminId)->where('role', 'admin')->firstOrFail();

        $validated = $request->validate([
            'class_ids' => 'present|array',
            'class_ids.*' => 'exists:classes,id',
            'can_manage_attendance' => 'sometimes|boolean',
            'can_manage_assessment' => 'sometimes|boolean',
            'can_manage_quiz'       => 'sometimes|boolean',
        ]);

        $canAttendance = $validated['can_manage_attendance'] ?? $admin->can_manage_attendance ?? true;
        $canAssessment = $validated['can_manage_assessment'] ?? $admin->can_manage_assessment ?? true;
        $canQuiz       = $validated['can_manage_quiz'] ?? $admin->can_manage_quiz ?? true;

        $syncData = [];
        foreach ($validated['class_ids'] as $cid) {
            $syncData[$cid] = [
                'can_manage_attendance' => $canAttendance,
                'can_manage_assessment' => $canAssessment,
                'can_manage_quiz'       => $canQuiz,
            ];
        }

        $admin->managedClasses()->sync($syncData);

        return response()->json([
            'status' => 'success',
            'message' => 'Penugasan kelas administrator berhasil diperbarui!',
            'data' => $admin->load('managedClasses'),
        ]);
    }

    /**
     * Move or enroll participants into a class (Super Admin).
     */
    public function addParticipants(Request $request, $id)
    {
        $class = ($id === 'general' || $id === '0') ? null : ClassRoom::findOrFail($id);

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $targetClassId = $class ? $class->id : null;

        User::whereIn('id', $validated['user_ids'])
            ->where('role', 'participant')
            ->update(['class_id' => $targetClassId]);

        return response()->json([
            'status' => 'success',
            'message' => count($validated['user_ids']) . ' peserta berhasil dimasukkan ke ' . ($class ? "kelas {$class->name}" : 'Kelas Umum') . '!',
        ]);
    }

    /**
     * Remove single participant from class (revert back to Kelas Umum).
     */
    public function removeParticipant($classId, $userId)
    {
        $user = User::where('id', $userId)->where('role', 'participant')->firstOrFail();
        $user->update(['class_id' => null]);

        return response()->json([
            'status' => 'success',
            'message' => "Peserta {$user->name} berhasil dikeluarkan ke Kelas Umum.",
        ]);
    }

    /**
     * Get Class Quiz Access status list.
     */
    public function getQuizAccess($classId)
    {
        $quizzes = Quiz::orderBy('id', 'desc')->get();
        $targetClassId = ($classId === 'general' || $classId === '0') ? null : (int)$classId;

        $accessRecords = ClassQuizAccess::where('class_id', $targetClassId)->get()->keyBy('quiz_id');

        $result = $quizzes->map(function ($q) use ($accessRecords) {
            $rec = $accessRecords->get($q->id);
            return [
                'id' => $q->quiz_code ?: (string)$q->id,
                'db_id' => $q->id,
                'quiz_id' => $q->id,
                'quiz_code' => $q->quiz_code,
                'title' => $q->title,
                'duration_minutes' => $q->duration_minutes,
                'passing_grade' => $q->passing_grade,
                'status' => $rec ? $rec->status : 'tutup',
                'opened_at' => $rec ? $rec->opened_at : null,
                'closed_at' => $rec ? $rec->closed_at : null,
                'opened_by' => $rec ? $rec->opened_by : null,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }

    /**
     * Toggle Buka / Tutup Quiz for a Class.
     */
    public function toggleQuizAccess(Request $request, $classId, $quizId)
    {
        $user = auth()->user();
        $validated = $request->validate([
            'status' => 'required|in:buka,tutup',
        ]);

        $targetClassId = ($classId === 'general' || $classId === '0') ? null : (int)$classId;

        // Restriction rule: Only Super Admin can open/close quiz for Kelas Umum
        if ($targetClassId === null && $user->role !== 'super_admin') {
            return response()->json(['status' => 'error', 'message' => 'Hanya Admin Utama yang berhak membuka/menutup kuis untuk Kelas Umum.'], 403);
        }

        // Restriction rule: Admin must have access to this class and can_manage_quiz permission
        if ($user->role === 'admin') {
            $pivot = ClassAdmin::where('class_id', $targetClassId)->where('user_id', $user->id)->first();
            if ($pivot) {
                if (!$pivot->can_manage_quiz) {
                    return response()->json(['status' => 'error', 'message' => 'Anda tidak memiliki hak kelola kuis di kelas ini.'], 403);
                }
            } else {
                if (!$user->can_manage_quiz) {
                    return response()->json(['status' => 'error', 'message' => 'Anda tidak memiliki izin mengelola kuis.'], 403);
                }
            }
        }

        // Cari kuis berdasarkan ID integer atau quiz_code (misal 'QZ-756')
        $quiz = Quiz::where('id', $quizId)
            ->orWhere('quiz_code', $quizId)
            ->first();

        if (!$quiz) {
            return response()->json(['status' => 'error', 'message' => 'Kuis tidak ditemukan.'], 404);
        }

        $access = ClassQuizAccess::where('class_id', $targetClassId)
            ->where('quiz_id', $quiz->id)
            ->first();

        if (!$access) {
            $access = new ClassQuizAccess();
            $access->class_id = $targetClassId;
            $access->quiz_id = $quiz->id;
        }

        $access->status = $validated['status'];
        $access->opened_by = $user->id;
        if ($validated['status'] === 'buka') {
            $access->opened_at = now();
            $access->closed_at = null;
        } else {
            $access->closed_at = now();
        }
        $access->save();

        $actionName = $validated['status'] === 'buka' ? 'OPEN_QUIZ' : 'CLOSE_QUIZ';
        $classTargetName = $targetClassId ? ("Kelas ID " . $targetClassId) : "Kelas Umum";
        \App\Services\AuditLogger::log(
            action: $actionName,
            module: 'Kuis',
            description: ($validated['status'] === 'buka' ? "Membuka" : "Menutup") . " akses kuis '{$quiz->title}' untuk {$classTargetName}",
            status: 'SUCCESS',
            properties: [
                'quiz_id' => $quiz->id,
                'quiz_code' => $quiz->quiz_code,
                'quiz_title' => $quiz->title,
                'class_id' => $targetClassId,
                'status' => $validated['status'],
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Akses kuis '{$quiz->title}' berhasil diubah menjadi: " . strtoupper($validated['status']),
            'data' => [
                'id' => $quiz->quiz_code ?: (string)$quiz->id,
                'db_id' => $quiz->id,
                'quiz_id' => $quiz->id,
                'quiz_code' => $quiz->quiz_code,
                'class_id' => $targetClassId,
                'status' => $access->status,
                'opened_at' => $access->opened_at,
                'closed_at' => $access->closed_at,
                'opened_by' => $access->opened_by,
            ],
        ]);
    }
}
