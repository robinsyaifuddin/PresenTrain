<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Get the dynamically resolved callback URL for Google OAuth.
     */
    protected function getGoogleRedirectUri(): string
    {
        $configured = config('services.google.redirect') ?: env('GOOGLE_REDIRECT_URI');
        $host = request()->getHost();
        $isLiveRequest = !in_array($host, ['localhost', '127.0.0.1']);

        if ($isLiveRequest) {
            if (!empty($configured) && str_starts_with($configured, 'https://')) {
                return $configured;
            }
            return 'https://presentrain.web.id/api/auth/google/callback';
        }

        return $configured ?: 'http://localhost:8000/api/auth/google/callback';
    }

    /**
     * Get the dynamically resolved frontend base URL.
     */
    protected function getFrontendUrl(): string
    {
        $host = request()->getHost();
        $isLiveRequest = !in_array($host, ['localhost', '127.0.0.1']);

        if ($isLiveRequest) {
            $configured = config('services.frontend_url') ?: env('FRONTEND_URL');
            if (!empty($configured) && str_starts_with($configured, 'https://')) {
                return rtrim($configured, '/');
            }
            return 'https://presentrain.web.id';
        }

        $frontendUrl = config('services.frontend_url') ?: env('FRONTEND_URL', 'http://localhost:5173');
        return rtrim($frontendUrl, '/');
    }

    /**
     * Redirect the user to the Google authentication page.
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')
            ->redirectUrl($this->getGoogleRedirectUri())
            ->setHttpClient(new \GuzzleHttp\Client(['verify' => false]))
            ->stateless()
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    /**
     * Obtain the user information from Google callback and process login/registration.
     */
    public function handleGoogleCallback()
    {
        $frontendUrl = $this->getFrontendUrl();
        $redirectUri = $this->getGoogleRedirectUri();

        try {
            $googleUser = Socialite::driver('google')
                ->redirectUrl($redirectUri)
                ->setHttpClient(new \GuzzleHttp\Client(['verify' => false]))
                ->stateless()
                ->user();
        } catch (\Exception $e) {
            \Log::error('Google Auth Callback Error: ' . $e->getMessage());
            return redirect($frontendUrl . '/login?google_auth=error&message=' . urlencode('Gagal autentikasi Google: ' . $e->getMessage()));
        }

        if (!$googleUser || empty($googleUser->getEmail())) {
            return redirect($frontendUrl . '/login?google_auth=error&message=' . urlencode('Gagal mengambil informasi profil dari akun Google Anda.'));
        }

        // Check if user exists by google_id OR email
        $user = User::where('google_id', $googleUser->getId())
                    ->orWhere('email', $googleUser->getEmail())
                    ->first();

        // Check if existing account was deactivated by admin
        if ($user && isset($user->status) && $user->status === 'Nonaktif') {
            return redirect($frontendUrl . '/login?google_auth=error&message=' . urlencode('Akun Anda dinonaktifkan oleh Administrator.'));
        }

        // If existing user and profile is already complete (instansi is filled and not '-')
        $isProfileComplete = $user && !empty($user->instansi) && trim($user->instansi) !== '-';

        if ($isProfileComplete) {
            // Existing user: link google_id & avatar if missing
            if (empty($user->google_id)) {
                $user->google_id = $googleUser->getId();
            }
            if (!empty($googleUser->getAvatar())) {
                $user->avatar = $googleUser->getAvatar();
            }
            if (empty($user->user_qr_token)) {
                $user->user_qr_token = User::generateUniqueParticipantToken();
            }
            $user->save();

            // Create Sanctum Token
            $token = $user->createToken('auth_token')->plainTextToken;

            // Determine destination dashboard route based on user role
            $targetRoute = '/peserta/beranda';
            if ($user->role === 'super_admin') {
                $targetRoute = '/adminutama/overview';
            } elseif ($user->role === 'admin') {
                $targetRoute = '/administrator/scanner-barcode';
            }

            $userQuery = http_build_query([
                'google_auth' => 'success',
                'token'       => $token,
                'user_id'     => $user->id,
                'name'        => $user->name,
                'email'       => $user->email,
                'role'        => $user->role,
                'status'      => $user->status ?? 'Aktif',
                'instansi'    => $user->instansi ?? '',
                'phone'       => $user->phone ?? '',
                'avatar'      => $user->avatar ?? '',
                'qr_token'    => $user->user_qr_token ?? '',
            ]);

            return redirect($frontendUrl . $targetRoute . '?' . $userQuery);
        }

        // New user or incomplete profile: Redirect to registration completion form
        $payload = [
            'google_id' => $googleUser->getId(),
            'email'     => $googleUser->getEmail(),
            'name'      => $googleUser->getName() ?: ($user ? $user->name : 'Pengguna Google'),
            'avatar'    => $googleUser->getAvatar() ?: ($user ? $user->avatar : null),
            'exp'       => now()->addMinutes(30)->timestamp,
        ];

        $tempToken = encrypt($payload);

        return redirect(
            $frontendUrl . '/login?google_auth=needs_completion' .
            '&temp_token=' . urlencode($tempToken) .
            '&name=' . urlencode($payload['name']) .
            '&email=' . urlencode($payload['email']) .
            '&avatar=' . urlencode($payload['avatar'] ?? '')
        );
    }

    /**
     * Direct Client-Side Google Token / Credential Verification (Google One-Tap & GSI support).
     */
    public function verifyGoogleToken(Request $request)
    {
        $token = $request->input('id_token') ?? $request->input('credential') ?? $request->input('access_token');

        if (!$token) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Token Google tidak ditemukan.',
            ], 422);
        }

        $googleUserData = null;

        try {
            // 1. Try verifying ID Token with Google OAuth tokeninfo API
            $response = Http::withoutVerifying()->get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $token,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $googleUserData = (object) [
                    'id'     => $data['sub'] ?? null,
                    'email'  => $data['email'] ?? null,
                    'name'   => $data['name'] ?? null,
                    'avatar' => $data['picture'] ?? null,
                ];
            } else {
                // 2. Fallback try UserInfo with Access Token
                $response2 = Http::withoutVerifying()->get('https://www.googleapis.com/oauth2/v3/userinfo', [
                    'access_token' => $token,
                ]);

                if ($response2->successful()) {
                    $data2 = $response2->json();
                    $googleUserData = (object) [
                        'id'     => $data2['sub'] ?? null,
                        'email'  => $data2['email'] ?? null,
                        'name'   => $data2['name'] ?? null,
                        'avatar' => $data2['picture'] ?? null,
                    ];
                }
            }
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memverifikasi token Google dengan server API: ' . $e->getMessage(),
            ], 500);
        }

        if (!$googleUserData || empty($googleUserData->email)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Token autentikasi Google tidak valid atau telah kedaluwarsa.',
            ], 401);
        }

        // Check if user exists by google_id OR email
        $user = User::where('google_id', $googleUserData->id)
                    ->orWhere('email', $googleUserData->email)
                    ->first();

        // If user already exists AND has valid instansi
        if ($user && !empty($user->instansi) && trim($user->instansi) !== '-') {
            if (empty($user->google_id)) {
                $user->google_id = $googleUserData->id;
            }
            if (!empty($googleUserData->avatar)) {
                $user->avatar = $googleUserData->avatar;
            }
            $user->save();
            $user->load(['classRoom', 'managedClasses']);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'status'  => 'success',
                'message' => 'Login Google berhasil!',
                'token'   => $token,
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

        // Needs completion of instansi & password
        $payload = [
            'google_id' => $googleUserData->id,
            'email'     => $googleUserData->email,
            'name'      => $googleUserData->name,
            'avatar'    => $googleUserData->avatar,
            'exp'       => now()->addMinutes(30)->timestamp,
        ];

        $tempToken = encrypt($payload);

        return response()->json([
            'status'     => 'needs_completion',
            'message'    => 'Silakan lengkapi data komisariat dan kata sandi.',
            'temp_token' => $tempToken,
            'name'       => $googleUserData->name,
            'email'      => $googleUserData->email,
            'avatar'     => $googleUserData->avatar,
        ], 200);
    }

    /**
     * Complete Google Registration with Name, Instansi, and Password.
     */
    public function completeRegistration(Request $request)
    {
        $validated = $request->validate([
            'temp_token' => 'required|string',
            'name'       => 'required|string|max:255',
            'instansi'   => 'required|string|max:255',
            'gender'     => 'nullable|in:L,P',
            'password'   => 'required|string|min:6',
            'phone'      => 'nullable|string|max:50',
        ], [
            'instansi.required' => 'Asal Komisariat wajib diisi.',
            'password.required' => 'Kata sandi wajib dibuat.',
            'password.min'      => 'Kata sandi minimal 6 karakter.',
        ]);

        try {
            $data = decrypt($validated['temp_token']);
            if (empty($data['exp']) || $data['exp'] < now()->timestamp) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Sesi pendaftaran Google telah kedaluwarsa. Silakan ulangi login dengan Google.',
                ], 422);
            }
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Token pendaftaran tidak valid atau telah rusak.',
            ], 422);
        }

        // Check if user already exists with this email
        $existingUser = User::where('email', $data['email'])->first();

        if ($existingUser) {
            $existingUser->google_id = $data['google_id'];
            $existingUser->name      = $validated['name'];
            $existingUser->instansi  = $validated['instansi'];
            if (!empty($validated['gender'])) {
                $existingUser->gender = $validated['gender'];
            }
            $existingUser->password  = Hash::make($validated['password']);
            if (!empty($validated['phone'])) {
                $existingUser->phone = $validated['phone'];
            }
            if (!empty($data['avatar'])) {
                $existingUser->avatar = $data['avatar'];
            }
            if (empty($existingUser->user_qr_token)) {
                $existingUser->user_qr_token = User::generateUniqueParticipantToken();
            }
            $existingUser->save();
            $user = $existingUser;
        } else {
            // Generate QR Token
            $qrToken = User::generateUniqueParticipantToken();

            $user = User::create([
                'google_id'     => $data['google_id'],
                'name'          => $validated['name'],
                'email'         => $data['email'],
                'password'      => Hash::make($validated['password']),
                'role'          => 'participant',
                'status'        => 'Aktif',
                'phone'         => $validated['phone'] ?? null,
                'instansi'      => $validated['instansi'],
                'gender'        => $validated['gender'] ?? null,
                'avatar'        => $data['avatar'] ?? null,
                'user_qr_token' => $qrToken,
            ]);
        }

        $user->load(['classRoom', 'managedClasses']);
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Pendaftaran Google berhasil!',
            'token'   => $token,
            'user'    => [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'role'          => $user->role,
                'status'        => $user->status ?? 'Aktif',
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
        ], 201);
    }
}
