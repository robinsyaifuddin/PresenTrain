<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Mail\ResetPasswordOtpMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;

class AuthController extends Controller
{
    /**
     * User Login.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            // Catat log jika percobaan login diarahkan pada akun admin
            if ($user && in_array(strtolower($user->role), ['admin_utama', 'super_admin', 'administrator', 'admin'])) {
                \App\Services\AuditLogger::log(
                    action: 'LOGIN',
                    module: 'Autentikasi',
                    description: "Percobaan login gagal untuk akun {$user->name} ({$user->email})",
                    status: 'FAILED',
                    failureReason: 'Kata sandi tidak cocok',
                    user: $user
                );
            }
            return response()->json([
                'status'  => 'error',
                'message' => 'Email atau kata sandi tidak cocok!',
            ], 401);
        }

        if ($user->status === 'Nonaktif') {
            if (in_array(strtolower($user->role), ['admin_utama', 'super_admin', 'administrator', 'admin'])) {
                \App\Services\AuditLogger::log(
                    action: 'LOGIN',
                    module: 'Autentikasi',
                    description: "Percobaan login ditolak karena akun {$user->name} nonaktif",
                    status: 'FAILED',
                    failureReason: 'Akun dinonaktifkan',
                    user: $user
                );
            }
            return response()->json([
                'status'  => 'error',
                'message' => 'Akun Anda dinonaktifkan oleh Koordinator / Admin Utama. Silakan hubungi Admin Utama.',
            ], 403);
        }

        // Catat log sukses jika login adalah akun administrator / admin utama
        if (in_array(strtolower($user->role), ['admin_utama', 'super_admin', 'administrator', 'admin'])) {
            \App\Services\AuditLogger::log(
                action: 'LOGIN',
                module: 'Autentikasi',
                description: "Login berhasil oleh {$user->name} ({$user->role})",
                status: 'SUCCESS',
                user: $user
            );
        }

        // Generate Sanctum token
        $token = $user->createToken('auth_token')->plainTextToken;

        $user->load(['classRoom', 'managedClasses']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Login berhasil!',
            'token'   => $token,
            'user'    => [
                'id'                    => $user->id,
                'name'                  => $user->name,
                'email'                 => $user->email,
                'role'                  => $user->role,
                'status'                => $user->status ?? 'Aktif',
                'class_id'              => $user->class_id,
                'class_name'            => $user->classRoom ? $user->classRoom->name : ($user->role === 'participant' ? 'Kelas Umum' : null),
                'class'                 => $user->classRoom ? [
                    'id' => $user->classRoom->id,
                    'name' => $user->classRoom->name,
                    'code' => $user->classRoom->code,
                ] : ($user->role === 'participant' ? [
                    'id' => null,
                    'name' => 'Kelas Umum',
                    'code' => 'KELAS-UMUM',
                ] : null),
                'managed_classes'       => $user->managedClasses->map(function ($c) {
                    return [
                        'id' => $c->id,
                        'name' => $c->name,
                        'code' => $c->code,
                        'can_manage_attendance' => (bool)$c->pivot->can_manage_attendance,
                        'can_manage_assessment' => (bool)$c->pivot->can_manage_assessment,
                        'can_manage_quiz'       => (bool)$c->pivot->can_manage_quiz,
                    ];
                }),
                'can_manage_attendance' => (bool) ($user->can_manage_attendance ?? true),
                'can_manage_assessment' => (bool) ($user->can_manage_assessment ?? true),
                'can_manage_quiz'       => (bool) ($user->can_manage_quiz ?? true),
                'phone'                 => $user->phone,
                'instansi'              => $user->instansi,
                'gender'                => $user->gender,
                'avatar'                => $user->avatar,
                'user_qr_token'         => $user->user_qr_token,
                'attendances'           => $this->formatAttendances($user),
            ],
        ], 200);
    }

    /**
     * Participant Registration (Auto generate QR token).
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'phone'    => 'nullable|string|max:50',
            'instansi' => 'nullable|string|max:255',
            'gender'   => 'nullable|in:L,P',
            'avatar'   => 'nullable|string',
        ]);

        // Generate unique numeric token (6 digits)
        $qrToken = User::generateUniqueParticipantToken();

        // Fast retry helper in rare collision event
        $user = null;
        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                $user = User::create([
                    'name'          => $validated['name'],
                    'email'         => $validated['email'],
                    'password'      => Hash::make($validated['password']),
                    'role'          => 'participant',
                    'phone'         => $validated['phone'] ?? null,
                    'instansi'      => $validated['instansi'] ?? null,
                    'gender'        => $validated['gender'] ?? null,
                    'avatar'        => $validated['avatar'] ?? null,
                    'user_qr_token' => $qrToken,
                ]);
                break;
            } catch (\Illuminate\Database\QueryException $e) {
                // Duplicate entry on user_qr_token or email
                if (str_contains($e->getMessage(), 'user_qr_token')) {
                    $qrToken = User::generateUniqueParticipantToken();
                    continue;
                }
                throw $e;
            }
        }

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mendaftarkan akun, silakan coba beberapa saat lagi.',
            ], 500);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Pendaftaran akun berhasil!',
            'token'   => $token,
            'user'    => [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'role'          => $user->role,
                'phone'         => $user->phone,
                'instansi'      => $user->instansi,
                'gender'        => $user->gender,
                'avatar'        => $user->avatar,
                'user_qr_token' => $user->user_qr_token,
            ],
        ], 201);
    }

    /**
     * Update User Profile & Avatar.
     */
    public function updateProfile(Request $request)
    {
        $user = null;
        if (auth('sanctum')->check()) {
            $user = auth('sanctum')->user();
        } elseif ($request->filled('email')) {
            $user = User::where('email', $request->email)->first();
        } elseif ($request->filled('id')) {
            $user = User::find($request->id);
        }

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'User tidak ditemukan!',
            ], 404);
        }

        $validated = $request->validate([
            'name'         => 'sometimes|string|max:255',
            'instansi'     => 'nullable|string|max:255',
            'gender'       => 'nullable|in:L,P',
            'phone'        => 'nullable|string|max:50',
            'avatar'       => 'nullable|string',
            'old_password' => 'nullable|string',
            'new_password' => 'nullable|string|min:6',
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['instansi'])) $user->instansi = $validated['instansi'];
        if (array_key_exists('gender', $validated)) $user->gender = $validated['gender'];
        if (isset($validated['phone'])) $user->phone = $validated['phone'];
        if (array_key_exists('avatar', $validated)) $user->avatar = $validated['avatar'];

        if (!empty($validated['new_password'])) {
            if (!empty($validated['old_password']) && !Hash::check($validated['old_password'], $user->password)) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Password lama tidak cocok!',
                ], 422);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        $user->save();
        $user->load(['classRoom', 'managedClasses']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Profil berhasil diperbarui!',
            'user'    => [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'role'          => $user->role,
                'class_id'      => $user->class_id,
                'class_name'    => $user->classRoom ? $user->classRoom->name : ($user->role === 'participant' ? 'Kelas Umum' : null),
                'class'         => $user->classRoom ? [
                    'id'   => $user->classRoom->id,
                    'name' => $user->classRoom->name,
                    'code' => $user->classRoom->code,
                ] : ($user->role === 'participant' ? [
                    'id'   => null,
                    'name' => 'Kelas Umum',
                    'code' => 'KELAS-UMUM',
                ] : null),
                'phone'         => $user->phone,
                'instansi'      => $user->instansi,
                'gender'        => $user->gender,
                'avatar'        => $user->avatar,
                'user_qr_token' => $user->user_qr_token,
            ],
        ], 200);
    }

    /**
     * Get Current Authenticated User Info.
     */
    public function me(Request $request)
    {
        $user = $request->user();

        if ($user->status === 'Nonaktif') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akun dinonaktifkan.',
            ], 403);
        }

        $user->load(['classRoom', 'managedClasses']);

        return response()->json([
            'status' => 'success',
            'user'   => [
                'id'                    => $user->id,
                'name'                  => $user->name,
                'email'                 => $user->email,
                'role'                  => $user->role,
                'status'                => $user->status ?? 'Aktif',
                'class_id'              => $user->class_id,
                'class_name'            => $user->classRoom ? $user->classRoom->name : ($user->role === 'participant' ? 'Kelas Umum' : null),
                'class'                 => $user->classRoom ? [
                    'id' => $user->classRoom->id,
                    'name' => $user->classRoom->name,
                    'code' => $user->classRoom->code,
                ] : ($user->role === 'participant' ? [
                    'id' => null,
                    'name' => 'Kelas Umum',
                    'code' => 'KELAS-UMUM',
                ] : null),
                'managed_classes'       => $user->managedClasses->map(function ($c) {
                    return [
                        'id' => $c->id,
                        'name' => $c->name,
                        'code' => $c->code,
                        'can_manage_attendance' => (bool)$c->pivot->can_manage_attendance,
                        'can_manage_assessment' => (bool)$c->pivot->can_manage_assessment,
                        'can_manage_quiz'       => (bool)$c->pivot->can_manage_quiz,
                    ];
                }),
                'can_manage_attendance' => (bool) ($user->can_manage_attendance ?? true),
                'can_manage_assessment' => (bool) ($user->can_manage_assessment ?? true),
                'can_manage_quiz'       => (bool) ($user->can_manage_quiz ?? true),
                'phone'                 => $user->phone,
                'instansi'              => $user->instansi,
                'gender'                => $user->gender,
                'avatar'                => $user->avatar,
                'user_qr_token'         => $user->user_qr_token,
                'attendances'           => $this->formatAttendances($user),
            ],
        ], 200);
    }

    /**
     * Format user attendances into keyed map for frontend.
     */
    protected function formatAttendances($user)
    {
        $user->load(['registrations.attendances.session', 'registrations.training.sessions']);
        $attMap = [];
        $recordedSessionIds = [];

        if ($user->registrations) {
            foreach ($user->registrations as $reg) {
                if ($reg->attendances) {
                    foreach ($reg->attendances as $att) {
                        $sess = $att->session;
                        $recordedSessionIds[] = (int) $att->training_session_id;
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

                // Cek sesi yang telah lewat tapi peserta belum presensi -> Otomatis Alfa / Tidak Hadir
                if ($reg->training && $reg->training->sessions) {
                    foreach ($reg->training->sessions as $trainingSess) {
                        if (!in_array((int)$trainingSess->id, $recordedSessionIds) && $trainingSess->is_passed) {
                            $code = $trainingSess->session_code ?: 'SES-' . $trainingSess->id;
                            $autoAbsent = [
                                'present'             => false,
                                'status'              => 'Tidak Hadir',
                                'raw_status'          => 'absent',
                                'note'                => 'Tidak Hadir / Alpa (Sesi telah berakhir)',
                                'time'                => '-',
                                'timestamp'           => null,
                                'source'              => 'auto_expired',
                                'training_session_id' => $trainingSess->id,
                            ];
                            $attMap[$code] = $autoAbsent;
                            $attMap['SES-' . $trainingSess->id] = $autoAbsent;
                            $attMap[$trainingSess->id] = $autoAbsent;
                            $padded = 'SES-' . str_pad($trainingSess->id, 2, '0', STR_PAD_LEFT);
                            $attMap[$padded] = $autoAbsent;
                        }
                    }
                }
            }
        }
        return $attMap;
    }

    /**
     * Send OTP to user's email via Hostinger Webmail SMTP.
     */
    public function sendResetOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = strtolower(trim($request->email));
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Alamat email tidak terdaftar di sistem PresenTrain.',
            ], 404);
        }

        // Rate limiting check: check if an OTP was requested less than 60 seconds ago
        $existing = DB::table('password_reset_tokens')->where('email', $email)->first();
        if ($existing && $existing->created_at) {
            $created = Carbon::parse($existing->created_at);
            if ($created->diffInSeconds(now()) < 60) {
                $wait = 60 - $created->diffInSeconds(now());
                return response()->json([
                    'status'  => 'error',
                    'message' => "Silakan tunggu {$wait} detik sebelum meminta kode OTP kembali.",
                ], 429);
            }
        }

        // Generate 6-digit OTP
        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        // Store hashed OTP and expiry (10 minutes)
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'token'      => Hash::make($otp),
                'created_at' => now(),
                'expires_at' => now()->addMinutes(10),
            ]
        );

        // Send email via Hostinger SMTP
        try {
            Mail::to($email)->send(new ResetPasswordOtpMail($otp, $user->name, 10));
        } catch (\Throwable $e) {
            \Log::error('Gagal mengirim email OTP: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengirim email OTP ke server. Pastikan email Anda aktif.',
            ], 500);
        }

        return response()->json([
            'status'     => 'success',
            'message'    => 'Kode OTP verifikasi 6-digit telah dikirimkan ke kotak masuk email Anda.',
            'expires_in' => 600,
        ]);
    }

    /**
     * Verify OTP code.
     */
    public function verifyResetOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $email = strtolower(trim($request->email));
        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode OTP tidak ditemukan atau belum pernah diminta.',
            ], 422);
        }

        if ($record->expires_at && Carbon::parse($record->expires_at)->isPast()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode OTP telah kedaluwarsa. Silakan minta kode baru.',
            ], 422);
        }

        if (!Hash::check(trim($request->otp), $record->token)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode OTP yang Anda masukkan salah. Silakan periksa email Anda.',
            ], 422);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Kode OTP valid! Silakan masukkan kata sandi baru Anda.',
        ]);
    }

    /**
     * Reset Password using verified OTP.
     */
    public function resetPasswordWithOtp(Request $request)
    {
        $request->validate([
            'email'        => 'required|email',
            'otp'          => 'required|string|size:6',
            'new_password' => 'required|string|min:6',
        ]);

        $email = strtolower(trim($request->email));
        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sesi reset kata sandi tidak valid. Silakan ulangi proses dari awal.',
            ], 422);
        }

        if ($record->expires_at && Carbon::parse($record->expires_at)->isPast()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode OTP telah kedaluwarsa. Silakan minta kode baru.',
            ], 422);
        }

        if (!Hash::check(trim($request->otp), $record->token)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode OTP tidak cocok! Perubahan kata sandi dibatalkan.',
            ], 422);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akun pengguna tidak ditemukan.',
            ], 404);
        }

        // Update password
        $user->password = Hash::make($request->new_password);
        $user->save();

        // Invalidate OTP record immediately
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.',
        ]);
    }

    /**
     * Send OTP to new email address for change email verification.
     */
    public function sendChangeEmailOtp(Request $request)
    {
        $request->validate([
            'new_email' => 'required|email',
        ]);

        $newEmail = strtolower(trim($request->new_email));

        if (User::where('email', $newEmail)->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Alamat email ini sudah terdaftar pada akun lain.',
            ], 422);
        }

        // Rate limit: 60s
        $existing = DB::table('password_reset_tokens')->where('email', $newEmail)->first();
        if ($existing && $existing->created_at) {
            $created = Carbon::parse($existing->created_at);
            if ($created->diffInSeconds(now()) < 60) {
                $wait = 60 - $created->diffInSeconds(now());
                return response()->json([
                    'status'  => 'error',
                    'message' => "Silakan tunggu {$wait} detik sebelum meminta kode OTP kembali.",
                ], 429);
            }
        }

        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $newEmail],
            [
                'token'      => Hash::make($otp),
                'created_at' => now(),
                'expires_at' => now()->addMinutes(10),
            ]
        );

        try {
            Mail::to($newEmail)->send(new \App\Mail\ChangeEmailOtpMail($otp, 'Pengguna PresenTrain', 10));
        } catch (\Throwable $e) {
            \Log::error('Gagal mengirim email OTP perubahan email: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengirim email OTP ke server. Pastikan email Anda aktif.',
            ], 500);
        }

        return response()->json([
            'status'     => 'success',
            'message'    => "Kode OTP verifikasi 6-digit telah dikirimkan ke {$newEmail}.",
            'expires_in' => 600,
        ]);
    }

    /**
     * Verify and update email using OTP.
     */
    public function verifyChangeEmailOtp(Request $request)
    {
        $request->validate([
            'current_email' => 'required|email',
            'new_email'     => 'required|email',
            'otp'           => 'required|string|size:6',
        ]);

        $currentEmail = strtolower(trim($request->current_email));
        $newEmail = strtolower(trim($request->new_email));

        $record = DB::table('password_reset_tokens')->where('email', $newEmail)->first();

        if (!$record) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode OTP tidak ditemukan atau belum pernah diminta.',
            ], 422);
        }

        if ($record->expires_at && Carbon::parse($record->expires_at)->isPast()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode OTP telah kedaluwarsa. Silakan minta kode baru.',
            ], 422);
        }

        if (!Hash::check(trim($request->otp), $record->token)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode OTP yang Anda masukkan salah. Silakan periksa email baru Anda.',
            ], 422);
        }

        $user = User::where('email', $currentEmail)->first();
        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akun pengguna saat ini tidak ditemukan.',
            ], 404);
        }

        if (User::where('email', $newEmail)->where('id', '!=', $user->id)->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Alamat email baru sudah dipakai oleh akun lain.',
            ], 422);
        }

        $user->email = $newEmail;
        $user->save();

        DB::table('password_reset_tokens')->where('email', $newEmail)->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Alamat email utama berhasil diperbarui!',
            'user'    => [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'role'          => $user->role,
                'phone'         => $user->phone,
                'instansi'      => $user->instansi,
                'avatar'        => $user->avatar,
                'user_qr_token' => $user->user_qr_token,
            ],
        ]);
    }
}
