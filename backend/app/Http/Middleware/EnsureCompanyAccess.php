<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCompanyAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $companyId = $request->session()->get('active_company_id');

        abort_unless($user && $companyId, 403);

        $membership = $user->companies()
            ->whereKey($companyId)
            ->wherePivot('status', 'active')
            ->first();

        abort_unless($membership, 403);

        app()->instance('activeCompany', $membership);

        return $next($request);
    }
}
