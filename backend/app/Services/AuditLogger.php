<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    /**
     * Catat aktivitas khusus Admin Utama dan Administrator
     *
     * @param string $action       LOGIN, LOGOUT, CREATE, UPDATE, DELETE, SCAN, EXPORT, dll
     * @param string $module       Autentikasi, Pelatihan, Sesi, Peserta, Administrator, Penilaian, Rekap
     * @param string $description  Deskripsi kejadian manusiawi
     * @param string $status       SUCCESS | FAILED
     * @param string|null $failureReason Alasan kegagalan jika status FAILED
     * @param array|null $properties Payload/snapshot perubahan
     * @param mixed $user          User model atau null (otomatis auth user)
     */
    public static function log(
        string $action,
        string $module,
        string $description,
        string $status = 'SUCCESS',
        ?string $failureReason = null,
        ?array $properties = null,
        $user = null
    ): ?ActivityLog {
        try {
            $actor = $user ?? auth('sanctum')->user() ?? auth()->user();

            // PENTING: Jika actor null dan tidak dipass, cek header token manual
            if (!$actor && Request::bearerToken()) {
                $token = \Laravel\Sanctum\PersonalAccessToken::findToken(Request::bearerToken());
                if ($token) {
                    $actor = $token->tokenable;
                }
            }

            // PENTING: Hanya catat jika user adalah admin_utama, administrator, atau sistem login admin
            $allowedRoles = ['admin_utama', 'super_admin', 'administrator', 'admin'];

            if ($actor) {
                $role = strtolower($actor->role ?? '');
                if (!in_array($role, $allowedRoles)) {
                    return null; // Abaikan peserta umum agar database tetap ringan
                }
            }

            return ActivityLog::create([
                'user_id'        => $actor?->id,
                'user_name'      => $actor?->name ?? 'Tamu / Sistem',
                'user_role'      => $actor?->role ?? 'administrator',
                'action'         => strtoupper($action),
                'module'         => $module,
                'description'    => $description,
                'status'         => strtoupper($status),
                'failure_reason' => $failureReason,
                'ip_address'     => Request::ip() ?? '127.0.0.1',
                'user_agent'     => substr(Request::userAgent() ?? 'Unknown Agent', 0, 250),
                'properties'     => $properties,
            ]);
        } catch (\Throwable $e) {
            // Hindari crash pada flow utama jika audit log gagal insert
            report($e);
            return null;
        }
    }
}
