<?php

use App\Http\Controllers\Api\WorkspacePreferencesController;
use App\Http\Controllers\Api\AdaptiveWindowPreferencesController;
use App\Http\Controllers\Api\DemoIncomingInvoicesController;
use App\Http\Controllers\Api\SyntheticReceiptSyncController;
use App\Http\Middleware\RequirePrivilegedTwoFactor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Session-only API. Browser cookies are verified by web guard; bearer tokens
// cannot bypass Fortify's interactive TOTP challenge.
Route::middleware(['auth:web','verified',RequirePrivilegedTwoFactor::class,'throttle:60,1'])->group(function (): void {
    Route::get('/me', function (Request $request): JsonResponse {
        $user = $request->user();

        $companies = $user->companies()
            ->where('companies.active', true)
            ->wherePivot('status', 'active')
            ->get(['companies.id','companies.name']);

        return response()->json(['data'=>[
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'companies' => $companies->map(fn ($company): array => [
                'id' => $company->id,
                'name' => $company->name,
            ])->values()->all(),
        ]])->header('Cache-Control','private, no-store');
    });

    Route::get('/companies/{companyId}/my/workspace-preferences',
        [WorkspacePreferencesController::class, 'show'])
        ->whereNumber('companyId');

    Route::put('/companies/{companyId}/my/workspace-preferences',
        [WorkspacePreferencesController::class, 'update'])
        ->whereNumber('companyId');
    // Authenticated, tenant-scoped, optimistic-concurrency adaptive view preferences.
    // View is the URL query parameter, and the user ID comes only from the session.
    Route::get('/companies/{companyId}/my/adaptive-views/{moduleKey}',
        [AdaptiveWindowPreferencesController::class, 'show'])
        ->whereNumber('companyId')->where('moduleKey', '[a-z_]+');
    Route::put('/companies/{companyId}/my/adaptive-views/{moduleKey}',
        [AdaptiveWindowPreferencesController::class, 'update'])
        ->whereNumber('companyId')->where('moduleKey', '[a-z_]+');

    // Proof-of-concept only: test/local + explicit flag + session+2FA+verified
    // + company Gate, encrypted synthetic envelope, no real financial side effects.
    Route::get('/companies/{companyId}/demo/sync-receipts/{documentId}',
        [SyntheticReceiptSyncController::class, 'show'])
        ->whereNumber('companyId')->where('documentId', '[A-Z0-9-]+');
    Route::get('/companies/{companyId}/demo/sync-receipts/{documentId}/latest',
        [SyntheticReceiptSyncController::class, 'latest'])
        ->whereNumber('companyId')->where('documentId', '[A-Z0-9-]+');
    Route::post('/companies/{companyId}/demo/sync-receipts/{documentId}',
        [SyntheticReceiptSyncController::class, 'store'])
        ->whereNumber('companyId')->where('documentId', '[A-Z0-9-]+');

    // Synthetic-only, explicit feature flag; never an accounting or OCR endpoint.
    Route::get('/companies/{companyId}/demo/incoming-invoices',
        [DemoIncomingInvoicesController::class, 'index'])->whereNumber('companyId');
    Route::post('/companies/{companyId}/demo/incoming-invoices',
        [DemoIncomingInvoicesController::class, 'store'])->whereNumber('companyId');
    Route::post('/companies/{companyId}/demo/incoming-invoices/{invoiceId}/approve',
        [DemoIncomingInvoicesController::class, 'approve'])
        ->whereNumber('companyId')->whereNumber('invoiceId');
});
