<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingController extends Controller
{
    /**
     * Get All Site Settings.
     */
    public function index()
    {
        try {
            $settings = Cache::remember('site_settings', 300, function () {
                $all = Setting::all()->pluck('value', 'key')->toArray();
                return array_merge([
                    'app_name'         => 'PresenTrain',
                    'tagline'          => 'Sistem Presensi Pelatihan Digital QR Code',
                    'support_email'    => 'support@presentrain.com',
                    'whatsapp_number'  => '6281234567890',
                    'maintenance_mode' => 'false',
                ], $all);
            });
        } catch (\Throwable $e) {
            // Graceful fallback jika MySQL sedang antre/koneksi penuh
            $settings = [
                'app_name'         => 'PresenTrain',
                'tagline'          => 'Sistem Presensi Pelatihan Digital QR Code',
                'support_email'    => 'support@presentrain.com',
                'whatsapp_number'  => '6281234567890',
                'maintenance_mode' => 'false',
            ];
        }

        return response()->json([
            'status' => 'success',
            'data'   => $settings,
        ], 200);
    }

    /**
     * Update Site Settings (Super Admin Only).
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => is_array($value) ? json_encode($value) : (string) $value]
            );
        }

        Cache::forget('site_settings');

        return response()->json([
            'status'  => 'success',
            'message' => 'Pengaturan situs berhasil diperbarui!',
        ], 200);
    }
}
