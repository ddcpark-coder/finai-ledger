<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequirePrivilegedTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user && $user->active && $user->hasVerifiedEmail(), 403);

        if ($user->requiresTwoFactor() && ! $user->two_factor_confirmed_at) {
            abort(403, 'Two-factor enrollment is required for privileged access.');
        }

        return $next($request);
    }
}
