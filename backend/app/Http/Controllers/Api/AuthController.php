<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
            return response()->json([
                'status'  => 'error',
                'message' => 'Email atau kata sandi tidak cocok!',
            ], 401);
        }

        // Generate Sanctum token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Login berhasil!',
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
            'avatar'   => 'nullable|string',
        ]);

        // Generate unique deterministic/random QR token
        $cleanName = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', Str::slug($validated['name'])));
        $shortName = substr($cleanName, 0, 8) ?: 'PESERTA';
        $randomSuffix = rand(100000, 999999);
        $qrToken = "ABSEN-PESERTA-{$shortName}-{$randomSuffix}";

        // Ensure token uniqueness
        while (User::where('user_qr_token', $qrToken)->exists()) {
            $randomSuffix = rand(100000, 999999);
            $qrToken = "ABSEN-PESERTA-{$shortName}-{$randomSuffix}";
        }

        $user = User::create([
            'name'          => $validated['name'],
            'email'         => $validated['email'],
            'password'      => Hash::make($validated['password']),
            'role'          => 'participant',
            'phone'         => $validated['phone'] ?? null,
            'instansi'      => $validated['instansi'] ?? null,
            'avatar'        => $validated['avatar'] ?? null,
            'user_qr_token' => $qrToken,
        ]);

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
            'phone'        => 'nullable|string|max:50',
            'avatar'       => 'nullable|string',
            'old_password' => 'nullable|string',
            'new_password' => 'nullable|string|min:6',
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['instansi'])) $user->instansi = $validated['instansi'];
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

        return response()->json([
            'status'  => 'success',
            'message' => 'Profil berhasil diperbarui!',
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
        ], 200);
    }

    /**
     * Get Current Authenticated User Info.
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'status' => 'success',
            'user'   => [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'role'          => $user->role,
                'phone'         => $user->phone,
                'instansi'      => $user->instansi,
                'avatar'        => $user->avatar,
                'user_qr_token' => $user->user_qr_token,
            ],
        ], 200);
    }
}
