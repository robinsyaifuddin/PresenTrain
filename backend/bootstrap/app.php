<?php

use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(HandleCors::class);
        $middleware->append(SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Sesi autentikasi telah berakhir atau token tidak valid. Silakan login kembali.',
                ], 401);
            }
        });

        $exceptions->render(function (\PDOException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $code = (int) $e->getCode();
                $isConnectionLimit = in_array($code, [1040, 1203, 1226, 2002, 2006]);
                if ($isConnectionLimit) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Layanan database server sedang memproses antrean beban tinggi. Silakan coba beberapa saat lagi.',
                    ], 503);
                }

                if (config('app.debug')) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => $e->getMessage(),
                    ], 500);
                }

                return response()->json([
                    'status'  => 'error',
                    'message' => 'Terjadi kendala pada koneksi database. Silakan coba beberapa saat lagi.',
                ], 500);
            }
        });

        $exceptions->render(function (QueryException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $driverCode = $e->errorInfo[1] ?? null;
                $isHighLoad = in_array($driverCode, [1040, 1203, 1226, 2002, 2006]);
                if ($isHighLoad) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Layanan database server sedang memproses beban data tinggi. Silakan muat ulang beberapa saat lagi.',
                    ], 503);
                }

                if (config('app.debug')) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => $e->getMessage(),
                    ], 500);
                }

                return response()->json([
                    'status'  => 'error',
                    'message' => 'Terjadi kesalahan pada kueri data database.',
                ], 500);
            }
        });
    })->create();

// Deteksi otomatis jika folder public_html berada sejajar dengan backend di shared hosting
$sharedPublicHtml = dirname(__DIR__, 2) . '/public_html';
if (is_dir($sharedPublicHtml)) {
    $app->usePublicPath($sharedPublicHtml);
}

return $app;
