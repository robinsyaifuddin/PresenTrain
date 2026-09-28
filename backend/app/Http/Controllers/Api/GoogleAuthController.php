<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect the user to the Google authentication page.
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * Obtain the user information from Google and process login/registration.
     */
    public function handleGoogleCallback()
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            return redirect($frontendUrl . '/?google_auth=error&message=' . urlencode('Gagal autentikasi Google: ' . $e->getMessage()));
        }

        // Check if user exists by google_id OR email
        $user = User::where('google_id', $googleUser->getId())
                    ->orWhere('email', $googleUser->getEmail())
                    ->first();

        // 1. If user already exists AND has instansi (registered completely)
        if ($user && !empty($user->instansi)) {
            // Update Google ID or avatar if not yet attached
            if (empty($user->google_id)) {
                $user->google_id = $googleUser->getId();
            }
            if (empty($user->avatar) && $googleUser->getAvatar()) {
                $user->avatar = $googleUser->getAvatar();
            }
            $user->save();

            // Create Sanctum Token
            $token = $user->createToken('auth_token')->plainTextToken;

            return redirect($frontendUrl . '/?google_auth=success&token=' . urlencode($token));
        }

        // 2. If new user OR existing user without instansi: require completion of profile
        $payload = [
            'google_id' => $googleUser->getId(),
            'email'     => $googleUser->getEmail(),
            'name'      => $googleUser->getName(),
            'avatar'    => $googleUser->getAvatar(),
            'exp'       => now()->addMinutes(30)->timestamp,
        ];

        $tempToken = encrypt($payload);

        return redirect($frontendUrl . '/?google_auth=needs_completion'
            . '&temp_token=' . urlencode($tempToken)
            . '&name=' . urlencode($googleUser->getName() ?? '')
            . '&email=' . urlencode($googleUser->getEmail() ?? '')
            . '&avatar=' . urlencode($googleUser->getAvatar() ?? ''));
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
            $existingUser->password  = Hash::make($validated['password']);
            if (!empty($validated['phone'])) {
                $existingUser->phone = $validated['phone'];
            }
            if (!empty($data['avatar'])) {
                $existingUser->avatar = $data['avatar'];
            }
            $existingUser->save();
            $user = $existingUser;
        } else {
            // Generate QR Token
            $cleanName = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', Str::slug($validated['name'])));
            $shortName = substr($cleanName, 0, 8) ?: 'PESERTA';
            $randomSuffix = rand(100000, 999999);
            $qrToken = "ABSEN-PESERTA-{$shortName}-{$randomSuffix}";

            while (User::where('user_qr_token', $qrToken)->exists()) {
                $randomSuffix = rand(100000, 999999);
                $qrToken = "ABSEN-PESERTA-{$shortName}-{$randomSuffix}";
            }

            $user = User::create([
                'google_id'     => $data['google_id'],
                'name'          => $validated['name'],
                'email'         => $data['email'],
                'password'      => Hash::make($validated['password']),
                'role'          => 'participant',
                'phone'         => $validated['phone'] ?? null,
                'instansi'      => $validated['instansi'],
                'avatar'        => $data['avatar'] ?? null,
                'user_qr_token' => $qrToken,
            ]);
        }

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
                'phone'         => $user->phone,
                'instansi'      => $user->instansi,
                'avatar'        => $user->avatar,
                'user_qr_token' => $user->user_qr_token,
            ],
        ], 201);
    }
}
