<?php

use App\Http\Controllers\AuthSessionController;
use Illuminate\Support\Facades\Route;

// No public registration; provisioning and invitation will be implemented later.
Route::post('/auth/login', [AuthSessionController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('auth.login');
Route::post('/auth/logout', [AuthSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('auth.logout');
