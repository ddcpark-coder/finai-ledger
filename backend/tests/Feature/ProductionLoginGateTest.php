<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Tests\TestCase;

/** Isolated in-memory tests only; no real users, host or database. */
final class ProductionLoginGateTest extends TestCase
{
    private function assertBlockedLogin(bool $withTwoFactor): void
    {
        // Exercise the gate independently; CSRF requires separate browser tests.
        $this->withoutMiddleware([
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
        ]);
        app()->instance('env', 'production');
        config(['finai.auth_release_enabled' => false]);

        $user = User::create([
            'name' => 'Synthetic User',
            'email' => 'gate@example.test',
            'password' => 'synthetic-password-2026',
            'active' => true,
        ]);
        $values = ['email_verified_at' => now()];

        if ($withTwoFactor) {
            $provider = app(TwoFactorAuthenticationProvider::class);
            $values += [
                'two_factor_secret' => encrypt($provider->generateSecretKey()),
                'two_factor_recovery_codes' => encrypt(json_encode(['synthetic-recovery'])),
                'two_factor_confirmed_at' => now(),
            ];
        }

        $user->forceFill($values)->save();

        $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'synthetic-password-2026',
        ])->assertStatus(503);

        $this->getJson('/api/me')->assertUnauthorized();
        $this->assertGuest('web');
    }

    public function test_production_release_gate_blocks_password_login(): void
    {
        $this->assertBlockedLogin(false);
    }

    public function test_production_release_gate_blocks_two_factor_challenge_start(): void
    {
        $this->assertBlockedLogin(true);
    }
}
