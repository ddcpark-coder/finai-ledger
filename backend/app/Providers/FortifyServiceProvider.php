<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Fortify;

final class FortifyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        RateLimiter::for('finai-login', function (Request $request) {
            $key = mb_strtolower((string) $request->input('email', '')).'|'.$request->ip();
            return Limit::perMinute(5)->by(hash('sha256', $key));
        });

        RateLimiter::for('finai-two-factor', function (Request $request) {
            return Limit::perMinute(5)->by((string) $request->ip());
        });

        Fortify::authenticateUsing(static function (Request $request): ?User {
            if (app()->environment('production')
                && ! config('finai.auth_release_enabled', false)) {
                abort(503, 'Login is disabled until the production 2FA release gate passes.');
            }

            $email = $request->input('email');
            $password = $request->input('password');
            if (! is_string($email) || ! is_string($password)) {
                return null;
            }

            $user = User::query()->where('email', mb_strtolower($email))->first();
            if (! $user || ! $user->active || ! $user->hasVerifiedEmail()) {
                return null;
            }

            if (! Hash::check($password, $user->password)) {
                return null;
            }

            // Elevated users must first enroll and confirm TOTP. Fortify will then
            // challenge them on every subsequent login, including recovery fallback.
            if ($user->requiresTwoFactor()
                && ! $user->two_factor_confirmed_at) {
                abort(403, 'Confirmed two-factor authentication is required for this role.');
            }

            return $user;
        });
    }
}
