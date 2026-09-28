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
     * Get Active Training & Sessions.
     */
    public function index()
    {
        $trainings = Cache::remember('trainings_list', 10, function () {
            return Training::with(['sessions' => function ($q) {
                $q->orderBy('session_date')->orderBy('start_time');
            }])
            ->where('status', 'Aktif')
            ->get();
        });

        return response()->json([
            'status' => 'success',
            'data'   => $trainings,
        ], 200);
    }

    /**
     * Get Single Training Details.
     */
    public function show($id)
    {
        $training = Training::with(['sessions', 'registrations.user'])->find($id);

        if (!$training) {
            return response()->json(['status' => 'error', 'message' => 'Pelatihan tidak ditemukan'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $training,
        ], 200);
    }
}
