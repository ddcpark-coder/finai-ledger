<?php

use App\Http\Controllers\Api\WorkspacePreferencesController;
use Illuminate\Support\Facades\Route;

// Requires a bootstrapped Laravel app, Sanctum and the fail-closed 'company.access' Gate.
Route::middleware(['auth:sanctum','throttle:60,1'])
    ->prefix('companies/{companyId}/my/workspace-preferences')
    ->group(function () {
        Route::get('/',[WorkspacePreferencesController::class,'show']);
        Route::put('/',[WorkspacePreferencesController::class,'update']);
    });
