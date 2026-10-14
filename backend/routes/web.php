<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app'     => 'PresenTrain High-Performance API',
        'version' => '1.0.0',
        'status'  => 'Online',
    ]);
});
