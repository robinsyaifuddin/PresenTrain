<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Training;
use App\Models\TrainingSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class TrainingController extends Controller
{
    /**
     * Get Active & All Trainings.
     */
    public function index(Request $request)
    {
        $status = $request->query('status');
        $cacheKey = 'trainings_list_' . ($status ?: 'all');

        try {
            $trainings = Cache::remember($cacheKey, 120, function () use ($status) {
                $query = Training::with(['sessions' => function ($q) {
                    $q->orderBy('session_date')->orderBy('start_time');
                }])->withCount('registrations');

                if ($status) {
                    $query->where('status', $status);
                }

                return $query->orderBy('created_at', 'desc')->get();
            });
        } catch (\Throwable $e) {
            $trainings = [];
        }

        return response()->json([
            'status' => 'success',
            'data'   => $trainings,
        ], 200);
    }

    /**
     * Get Single Training Details with Sessions and Registrations.
     */
    public function show($id)
    {
        $training = Training::with([
            'sessions' => function ($q) {
                $q->orderBy('session_date')->orderBy('start_time');
            },
            'registrations.user' => function ($q) {
                $q->select('id', 'name', 'email', 'instansi', 'user_qr_token', 'avatar');
            }
        ])->find($id);

        if (!$training) {
            return response()->json(['status' => 'error', 'message' => 'Pelatihan tidak ditemukan'], 404);
        }

        // Lazy sync status sesi berdasarkan waktu & barcode
        if ($training->sessions) {
            foreach ($training->sessions as $sess) {
                $sess->syncDynamicStatus();
            }
        }

        return response()->json([
            'status' => 'success',
            'data'   => $training,
        ], 200);
    }

    /**
     * Create New Training.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code'        => 'nullable|string|max:50|unique:trainings,code',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'location'    => 'nullable|string|max:255',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'status'      => 'nullable|in:Draft,Aktif,Selesai',
        ]);

        $validated['created_by'] = auth()->id();
        $training = Training::create($validated);
        $this->flushTrainingCache();

        return response()->json([
            'status'  => 'success',
            'message' => 'Pelatihan baru berhasil dibuat!',
            'data'    => $training,
        ], 201);
    }

    /**
     * Update Training.
     */
    public function update(Request $request, $id = null)
    {
        $training = null;
        if ($id) {
            $training = Training::find($id);
        }
        if (!$training) {
            $training = Training::first();
        }
        if (!$training) {
            $training = Training::create([
                'code'       => 'TR-HMI-BDL-2026',
                'title'      => $request->input('title', 'Basic Training Raya HMI Cabang Bandar Lampung 2026'),
                'location'   => $request->input('location', 'Sekretariat HMI Cabang Bandar Lampung'),
                'start_date' => $request->input('start_date', now()->format('Y-m-d')),
                'end_date'   => $request->input('end_date', now()->addDays(2)->format('Y-m-d')),
                'status'     => 'Aktif',
            ]);
        }

        $validated = $request->validate([
            'code'          => 'nullable|string|max:50|unique:trainings,code,' . $training->id,
            'title'         => 'sometimes|string|max:255',
            'description'   => 'nullable|string',
            'location'      => 'nullable|string|max:255',
            'start_date'    => 'sometimes|date',
            'end_date'      => 'sometimes|date|after_or_equal:start_date',
            'status'        => 'nullable|in:Draft,Aktif,Selesai',
            'banner_slides' => 'nullable',
        ]);

        $training->update($validated);
        $this->flushTrainingCache();

        return response()->json([
            'status'  => 'success',
            'message' => 'Data pelatihan berhasil diperbarui!',
            'data'    => $training,
        ], 200);
    }

    /**
     * Delete Training.
     */
    public function destroy($id)
    {
        $training = Training::find($id);
        if (!$training) {
            return response()->json(['status' => 'error', 'message' => 'Pelatihan tidak ditemukan'], 404);
        }

        $training->delete();
        $this->flushTrainingCache();

        return response()->json([
            'status'  => 'success',
            'message' => 'Pelatihan berhasil dihapus!',
        ], 200);
    }

    /**
     * Create Training Session.
     */
    public function storeSession(Request $request, $trainingId)
    {
        $training = is_numeric($trainingId) ? Training::find((int) $trainingId) : Training::where('code', $trainingId)->first();
        if (!$training && !is_numeric($trainingId)) {
            $digits = (int) preg_replace('/\D/', '', (string) $trainingId);
            if ($digits > 0) $training = Training::find($digits);
        }
        if (!$training) {
            $training = Training::first();
        }
        if (!$training) {
            return response()->json(['status' => 'error', 'message' => 'Pelatihan tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'session_code' => 'nullable|string|max:50',
            'title'        => 'required|string|max:255',
            'speaker'      => 'nullable|string|max:255',
            'room'         => 'nullable|string|max:255',
            'session_date' => 'required|date',
            'start_time'   => 'required',
            'end_time'     => 'required',
            'status'       => 'nullable|string|max:50',
        ]);

        $validated['training_id'] = $training->id;
        $session = TrainingSession::create($validated);
        $this->flushTrainingCache();

        \App\Services\AuditLogger::log(
            action: 'CREATE',
            module: 'Pelatihan',
            description: "Menambahkan sesi pelatihan baru: {$session->title} ({$session->session_code})",
            status: 'SUCCESS',
            properties: [
                'session_id' => $session->id,
                'session_code' => $session->session_code,
                'title' => $session->title,
                'status' => $session->status
            ]
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Sesi pelatihan berhasil ditambahkan!',
            'data'    => $session,
        ], 201);
    }

    /**
     * Update Training Session.
     */
    public function updateSession(Request $request, $sessionId)
    {
        $session = is_numeric($sessionId) ? TrainingSession::find((int) $sessionId) : TrainingSession::where('session_code', $sessionId)->first();
        if (!$session && !is_numeric($sessionId)) {
            $digits = (int) preg_replace('/\D/', '', (string) $sessionId);
            if ($digits > 0) {
                $session = TrainingSession::find($digits) ?: TrainingSession::where('session_code', 'SES-' . str_pad($digits, 2, '0', STR_PAD_LEFT))->first();
            }
        }
        if (!$session) {
            return response()->json(['status' => 'error', 'message' => 'Sesi pelatihan tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'session_code' => 'nullable|string|max:50',
            'title'        => 'sometimes|string|max:255',
            'speaker'      => 'nullable|string|max:255',
            'room'         => 'nullable|string|max:255',
            'session_date' => 'sometimes|date',
            'start_time'   => 'sometimes',
            'end_time'     => 'sometimes',
            'status'       => 'nullable|string|max:50',
        ]);

        $session->update($validated);
        $this->flushTrainingCache();

        \App\Services\AuditLogger::log(
            action: 'UPDATE',
            module: 'Pelatihan',
            description: "Memperbarui sesi pelatihan: {$session->title} (Status: {$session->status})",
            status: 'SUCCESS',
            properties: [
                'session_id' => $session->id,
                'title' => $session->title,
                'status' => $session->status
            ]
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Sesi pelatihan berhasil diperbarui!',
            'data'    => $session,
        ], 200);
    }

    /**
     * Delete Training Session.
     */
    public function destroySession($sessionId)
    {
        $session = is_numeric($sessionId) ? TrainingSession::find((int) $sessionId) : TrainingSession::where('session_code', $sessionId)->first();
        if (!$session && !is_numeric($sessionId)) {
            $digits = (int) preg_replace('/\D/', '', (string) $sessionId);
            if ($digits > 0) {
                $session = TrainingSession::find($digits) ?: TrainingSession::where('session_code', 'SES-' . str_pad($digits, 2, '0', STR_PAD_LEFT))->first();
            }
        }
        if (!$session) {
            return response()->json(['status' => 'error', 'message' => 'Sesi pelatihan tidak ditemukan'], 404);
        }

        $title = $session->title;
        $id = $session->id;

        $session->delete();
        $this->flushTrainingCache();

        \App\Services\AuditLogger::log(
            action: 'DELETE',
            module: 'Pelatihan',
            description: "Menghapus sesi pelatihan: {$title}",
            status: 'SUCCESS',
            properties: [
                'session_id' => $id,
                'title' => $title
            ]
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Sesi pelatihan berhasil dihapus!',
        ], 200);
    }

    /**
     * Flush all training cache keys.
     */
    protected function flushTrainingCache(): void
    {
        Cache::forget('trainings_list');
        Cache::forget('trainings_list_all');
        Cache::forget('trainings_list_Aktif');
        Cache::forget('trainings_list_Selesai');
        Cache::forget('trainings_list_Draft');
    }
}
