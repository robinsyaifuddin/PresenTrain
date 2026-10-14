<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * Get All Users / Participants with Pagination and Filters.
     */
    public function index(Request $request)
    {
        try {
            $role = $request->query('role');
            $search = $request->query('search');
            $classId = $request->query('class_id');
            $gender = $request->query('gender');
            $instansi = $request->query('instansi');

            $currentUser = auth('sanctum')->user() ?: auth()->user();

            // Kolom standar yang dipastikan ada di skema users
            $columns = [
                'id', 'name', 'email', 'role', 'phone', 'instansi', 
            'user_qr_token', 'created_at'
        ];
        
        // Kolom opsional dari migrasi lanjutan (agar aman bila belum di-migrate)
        $optionalColumns = [
            'status', 'gender', 'class_id', 
            'can_manage_attendance', 'can_manage_assessment', 'can_manage_quiz'
        ];
        foreach ($optionalColumns as $col) {
            if (Schema::hasColumn('users', $col)) {
                $columns[] = $col;
            }
        }

        $query = User::select($columns)->with([
            'registrations.attendances.session', 
            'classRoom:id,name,code', 
            'managedClasses:id,name,code'
        ]);

        // Class Scoping for Administrator
        if ($currentUser && in_array(strtolower($currentUser->role), ['admin', 'panitia'])) {
            $accessibleClassIds = $currentUser->managedClasses()->pluck('classes.id')->all();
            if (!empty($accessibleClassIds)) {
                if ($classId && in_array((int)$classId, $accessibleClassIds)) {
                    $query->where('class_id', $classId);
                } else {
                    $query->whereIn('class_id', $accessibleClassIds);
                }
            }
        } elseif ($classId !== null) {
            if ($classId === 'general' || $classId === 'none' || $classId === '0') {
                $query->whereNull('class_id');
            } else {
                $query->where('class_id', $classId);
            }
        }

        if ($role) {
            $query->where('role', $role);
        }

        if ($gender && $gender !== 'ALL' && Schema::hasColumn('users', 'gender')) {
            $query->where('gender', $gender);
        }

        if ($instansi && $instansi !== 'ALL') {
            $query->where('instansi', $instansi);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('instansi', 'like', "%{$search}%")
                  ->orWhere('user_qr_token', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->query('sort_by');
        $sortDir = strtolower($request->query('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';

        if ($sortBy && in_array($sortBy, ['name', 'id', 'created_at', 'class_id', 'instansi'])) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            // Default urutan data alfabetis ABCD (nama A-Z)
            $query->orderBy('name', 'asc');
        }

        $users = $query->paginate($request->query('per_page', 500));

        $items = $users->getCollection()->transform(function ($u) {
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
            $u->className = $u->classRoom ? $u->classRoom->name : ($u->role === 'participant' ? 'Kelas Umum' : null);
            $u->classCode = $u->classRoom ? $u->classRoom->code : ($u->role === 'participant' ? 'KELAS-UMUM' : null);
            $u->managed_classes_names = $u->managedClasses ? $u->managedClasses->pluck('name')->all() : [];
            return $u;
        });

        return response()->json([
            'status'     => 'success',
            'data'       => $items->values()->all(),
            'pagination' => [
                'total'        => $users->total(),
                'per_page'     => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
            ]
        ], 200);
    } catch (\Throwable $e) {
        return response()->json([
            'status'     => 'error',
            'message'    => 'Layanan database sedang sibuk. Silakan coba kembali dalam beberapa saat.',
            'data'       => [],
            'pagination' => [
                'total'        => 0,
                'per_page'     => (int) $request->query('per_page', 500),
                'current_page' => 1,
                'last_page'    => 1,
            ]
        ], 500);
    }
}

    /**
     * Show Single User Details with Attendances.
     */
    public function show($id)
    {
        $user = User::with(['registrations.attendances.session', 'registrations.training'])->find($id);

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
        }

        $attMap = [];
        if ($user->registrations) {
            foreach ($user->registrations as $reg) {
                if ($reg->attendances) {
                    foreach ($reg->attendances as $att) {
                        $sess = $att->session;
                        $code = $sess ? ($sess->session_code ?: 'SES-' . $sess->id) : ('SES-' . $att->training_session_id);
                        $timeFmt = $att->scanned_at ? \Carbon\Carbon::parse($att->scanned_at)->format('H:i') . ' WIB' : '-';
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
                            'timestamp'           => $att->scanned_at ? $att->scanned_at->toISOString() : null,
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
        $user->attendances = $attMap;

        return response()->json([
            'status' => 'success',
            'data'   => $user,
        ], 200);
    }

    /**
     * Store New User / Participant by Admin.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|email|unique:users,email',
            'password'              => 'required|string|min:6',
            'role'                  => 'required|in:super_admin,admin,participant',
            'class_id'              => 'nullable|exists:classes,id',
            'status'                => 'sometimes|in:Aktif,Nonaktif',
            'can_manage_attendance' => 'sometimes|boolean',
            'can_manage_assessment' => 'sometimes|boolean',
            'can_manage_quiz'       => 'sometimes|boolean',
            'instansi'              => 'nullable|string|max:255',
            'gender'                => 'nullable|in:L,P',
            'phone'                 => 'nullable|string|max:50',
            'avatar'                => 'nullable|string',
        ]);


        // =========================================================================
        // ATOMIC USER CREATE + UNIQUE QR TOKEN GENERATION
        // Masalah sebelumnya: while loop + exists() + create() tanpa transaction
        // = race condition jika 2 admin create user bersamaan dengan nama mirip
        // Sekarang: token berbasis microtime (hampir mustahil collision) + try/catch
        // pada QueryException untuk auto-retry jika terjadi collision ekstrem
        // =========================================================================
        $cleanName    = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', Str::slug($validated['name'])));
        $shortName    = substr($cleanName, 0, 8) ?: 'PESERTA';
        // Microtime-based suffix: 1000x lebih unik daripada rand(), no loop needed
        $uniqueSuffix = substr(str_replace('.', '', (string)microtime(true)), -6);
        $qrToken      = "ABSEN-PESERTA-{$shortName}-{$uniqueSuffix}";

        // Fallback: jika by chance masih collision (sangat jarang), generate ulang
        if (User::where('user_qr_token', $qrToken)->exists()) {
            $qrToken = "ABSEN-PESERTA-{$shortName}-" . rand(100000, 999999);
        }

        try {
            $user = DB::transaction(function () use ($validated, $qrToken) {
                return User::create([
                    'name'                  => $validated['name'],
                    'email'                 => $validated['email'],
                    'password'              => Hash::make($validated['password']),
                    'role'                  => $validated['role'],
                    'class_id'              => $validated['role'] === 'participant' ? ($validated['class_id'] ?? null) : null,
                    'status'                => $validated['status'] ?? 'Aktif',
                    'can_manage_attendance' => $validated['can_manage_attendance'] ?? true,
                    'can_manage_assessment' => $validated['can_manage_assessment'] ?? true,
                    'can_manage_quiz'       => $validated['can_manage_quiz'] ?? true,
                    'instansi'              => $validated['instansi'] ?? null,
                    'gender'                => $validated['gender'] ?? null,
                    'phone'                 => $validated['phone'] ?? null,
                    'avatar'                => $validated['avatar'] ?? null,
                    'user_qr_token'         => $qrToken,
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Jika unique constraint terkena (edge case ekstrem), retry dengan token baru
            if ($e->errorInfo[1] === 1062) {
                $qrToken = "ABSEN-PESERTA-{$shortName}-" . rand(100000, 999999) . rand(10, 99);
                $user = User::create([
                    'name'                  => $validated['name'],
                    'email'                 => $validated['email'],
                    'password'              => Hash::make($validated['password']),
                    'role'                  => $validated['role'],
                    'class_id'              => $validated['role'] === 'participant' ? ($validated['class_id'] ?? null) : null,
                    'status'                => $validated['status'] ?? 'Aktif',
                    'can_manage_attendance' => $validated['can_manage_attendance'] ?? true,
                    'can_manage_assessment' => $validated['can_manage_assessment'] ?? true,
                    'can_manage_quiz'       => $validated['can_manage_quiz'] ?? true,
                    'instansi'              => $validated['instansi'] ?? null,
                    'gender'                => $validated['gender'] ?? null,
                    'phone'                 => $validated['phone'] ?? null,
                    'avatar'                => $validated['avatar'] ?? null,
                    'user_qr_token'         => $qrToken,
                ]);
            } else {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Gagal membuat pengguna: ' . $e->getMessage(),
                ], 500);
            }
        }

        \App\Services\AuditLogger::log(
            action: 'CREATE',
            module: $user->role === 'participant' ? 'Peserta' : 'Administrator',
            description: "Menambahkan pengguna baru: {$user->name} ({$user->role})",
            status: 'SUCCESS',
            properties: ['user_id' => $user->id, 'email' => $user->email, 'role' => $user->role]
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Pengguna berhasil dibuat!',
            'data'    => $user->load('classRoom'),
        ], 201);
    }

    /**
     * Update User Info or Password.
     */
    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'name'                  => 'sometimes|string|max:255',
            'email'                 => 'sometimes|email|unique:users,email,' . $id,
            'role'                  => 'sometimes|in:super_admin,admin,participant',
            'class_id'              => 'nullable|exists:classes,id',
            'status'                => 'sometimes|in:Aktif,Nonaktif',
            'can_manage_attendance' => 'sometimes|boolean',
            'can_manage_assessment' => 'sometimes|boolean',
            'can_manage_quiz'       => 'sometimes|boolean',
            'instansi'              => 'nullable|string|max:255',
            'gender'                => 'nullable|in:L,P',
            'phone'                 => 'nullable|string|max:50',
            'password'              => 'nullable|string|min:6',
            'avatar'                => 'nullable|string',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        if (isset($validated['role']) && $validated['role'] !== 'participant') {
            $validated['class_id'] = null;
        }

        $oldName = $user->name;
        $user->update($validated);

        \App\Services\AuditLogger::log(
            action: 'UPDATE',
            module: $user->role === 'participant' ? 'Peserta' : 'Administrator',
            description: "Memperbarui data pengguna: {$user->name} ({$user->role})",
            status: 'SUCCESS',
            properties: ['user_id' => $user->id, 'changes' => array_keys($validated)]
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Data pengguna berhasil diperbarui!',
            'data'    => $user->load('classRoom'),
        ], 200);
    }

    /**
     * Delete User.
     */
    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
        }

        $deletedInfo = ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role];
        $user->delete();

        \App\Services\AuditLogger::log(
            action: 'DELETE',
            module: $deletedInfo['role'] === 'participant' ? 'Peserta' : 'Administrator',
            description: "Menghapus akun pengguna: {$deletedInfo['name']} ({$deletedInfo['role']})",
            status: 'SUCCESS',
            properties: $deletedInfo
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Pengguna berhasil dihapus!',
        ], 200);
    }
}
