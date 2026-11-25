<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Read-only infrastructure check, not an authorization to accept financial data.
 * Public response must never disclose DB names, usernames, versions or errors.
 */
final class ApiReadinessController
{
    public function __invoke(): JsonResponse
    {
        $headers = ['Cache-Control' => 'no-store, private'];

        if (! config('finai.api_readiness_enabled', false)) {
            return response()->json(['status' => 'unavailable'], 503, $headers);
        }

        if (app()->environment('production')
            && (config('database.default') !== 'mysql'
                || config('app.debug') !== false
                || config('session.secure') !== true)) {
            return response()->json(['status' => 'unavailable'], 503, $headers);
        }

        try {
            // Deliberately uses a constant read-only query, no migrations or writes.
            DB::connection()->select('SELECT 1');
        } catch (Throwable) {
            return response()->json(['status' => 'unavailable'], 503, $headers);
        }

        // This confirms ONLY DB connectivity, not isolated privileges, tenant QA,
        // configured identity or legal readiness for production bookkeeping.
        return response()->json(['status' => 'database-reachable'], 200, $headers);
    }
}
