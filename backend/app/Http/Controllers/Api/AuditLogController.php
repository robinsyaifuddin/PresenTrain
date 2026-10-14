<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Mengambil daftar log aktivitas dengan filter multi-parameter
     */
    public function index(Request $request)
    {
        $query = ActivityLog::query();

        // 1. Filter per Administrator / User ID
        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where('user_id', $request->user_id);
        }

        // 2. Filter Role
        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('user_role', $request->role);
        }

        // 3. Filter Status (SUCCESS / FAILED)
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', strtoupper($request->status));
        }

        // 4. Filter Modul
        if ($request->filled('module') && $request->module !== 'all') {
            $query->where('module', $request->module);
        }

        // 5. Filter Aksi (LOGIN, CREATE, UPDATE, DELETE, dll)
        if ($request->filled('action') && $request->action !== 'all') {
            $query->where('action', strtoupper($request->action));
        }

        // 6. Filter Tanggal Mulai & Akhir
        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // 7. Pencarian Bebas (search keyword di deskripsi, user_name, atau IP)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('user_name', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        // Urutkan dari yang paling baru
        $query->orderBy('created_at', 'desc');

        $perPage = min((int) $request->input('per_page', 20), 100);
        $logs = $query->paginate($perPage);

        // Ambil list admin untuk dropdown filter
        $admins = User::whereIn('role', ['admin_utama', 'super_admin', 'administrator', 'admin'])
            ->select('id', 'name', 'email', 'role')
            ->orderBy('name')
            ->get();

        // Ringkasan Statistik Cepat
        $stats = [
            'total_today' => ActivityLog::whereDate('created_at', today())->count(),
            'success_today' => ActivityLog::whereDate('created_at', today())->where('status', 'SUCCESS')->count(),
            'failed_today' => ActivityLog::whereDate('created_at', today())->where('status', 'FAILED')->count(),
            'total_all' => ActivityLog::count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
            'admins' => $admins,
            'stats' => $stats,
        ]);
    }

    /**
     * Detail log tunggal (termasuk snapshot properti JSON lengkap)
     */
    public function show($id)
    {
        $log = ActivityLog::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $log,
        ]);
    }
}
