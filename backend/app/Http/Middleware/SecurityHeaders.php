<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Menambahkan header keamanan esensial untuk mencegah XSS, Clickjacking,
     * dan MIME sniffing pada response web/API.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Mencegah browser menebak MIME type file (Cegah eksekusi file berbahaya)
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Mencegah Clickjacking (tidak bisa di-embed di iframe domain luar)
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

        // Proteksi XSS bawaan browser lama
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Membatasi pengiriman referrer demi privasi & keamanan token
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Batasi akses sensor hardware hanya untuk kamera (dibutuhkan scan QR PresenTrain)
        $response->headers->set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

        return $response;
    }
}
