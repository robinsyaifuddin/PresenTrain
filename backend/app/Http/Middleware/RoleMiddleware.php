<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akses ditolak. Pengguna belum terautentikasi.',
            ], 401);
        }

        if (!in_array($user->role, $roles, true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akses terlarang. Peran akun Anda (' . $user->role . ') tidak memiliki izin ke modul ini.',
            ], 403);
        }

        return $next($request);
    }
}
