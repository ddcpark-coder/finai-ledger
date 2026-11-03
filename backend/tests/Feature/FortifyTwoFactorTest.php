<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Tests\TestCase;

final class FortifyTwoFactorTest extends TestCase
{
    private function createUser(bool $privileged=false): User
    {
        $user=User::create([
            'name'=>'Nina Test',
            'email'=>'two-factor@example.test',
            'password'=>'test-password-secure-length',
            'active'=>true,
        ]);
        $user->forceFill(['email_verified_at'=>now()])->save();

        $company=Company::create(['name'=>'Private Test Company','active'=>true]);
        $role=DB::table('roles')->insertGetId([
            'key'=>$privileged?'owner':'viewer',
            'name'=>$privileged?'Owner':'Viewer',
            'system'=>true,
            'created_at'=>now(),'updated_at'=>now(),
        ]);
        $user->companies()->attach($company->id,[
            'role_id'=>$role, 'status'=>'active','joined_at'=>now(),
        ]);
        return $user;
    }

    public function test_fortify_does_not_expose_registration_or_legacy_password_login(): void
    {
        $this->postJson('/register',[
            'name'=>'Malicious','email'=>'new@example.test','password'=>'some-password',
        ])->assertNotFound();
        $this->postJson('/auth/login',[
            'email'=>'two-factor@example.test','password'=>'some-password',
        ])->assertNotFound();
    }

    public function test_privileged_user_must_confirm_two_factor_before_login_or_api_use(): void
    {
        $user=$this->createUser(true);
        $companyId=$user->companies()->firstOrFail()->id;

        $this->postJson('/login',[
            'email'=>$user->email,'password'=>'test-password-secure-length',
        ])->assertForbidden();

        $this->actingAs($user)
            ->getJson("/api/companies/{$companyId}/my/workspace-preferences")
            ->assertForbidden();
    }

    public function test_privileged_user_must_pass_totp_challenge(): void
    {
        $user=$this->createUser(true);
        $provider=app(TwoFactorAuthenticationProvider::class);
        $secret=$provider->generateSecretKey();
        $recovery='recovery-test-only-7fce93b2';

        $user->forceFill([
            'two_factor_secret'=>encrypt($secret),
            'two_factor_recovery_codes'=>encrypt(json_encode([$recovery])),
            'two_factor_confirmed_at'=>now(),
        ])->save();

        $this->postJson('/login',[
            'email'=>$user->email,'password'=>'test-password-secure-length',
        ])->assertOk()->assertJsonPath('two_factor',true);

        // Password-only login must not set an authenticated API session.
        $this->getJson('/api/me')->assertUnauthorized();

        $this->postJson('/two-factor-challenge',[
            'code'=>'000000',
        ])->assertUnprocessable();

        $validCode=(new \PragmaRX\Google2FA\Google2FA)->getCurrentOtp($secret);
        $this->postJson('/two-factor-challenge',[
            'code'=>$validCode,
        ])->assertSuccessful();

        $this->getJson('/api/me')->assertOk()
            ->assertJsonPath('data.email',$user->email);

        $this->postJson('/logout')->assertSuccessful();

        // A recovery code may substitute TOTP once and is then consumed.
        $this->postJson('/login',[
            'email'=>$user->email,'password'=>'test-password-secure-length',
        ])->assertOk()->assertJsonPath('two_factor',true);
        $this->postJson('/two-factor-challenge',[
            'recovery_code'=>$recovery,
        ])->assertSuccessful();
        $this->getJson('/api/me')->assertOk();
        $this->assertNotContains($recovery,$user->fresh()->recoveryCodes());
    }

    public function test_privileged_user_cannot_bypass_enrollment_with_disabled_company(): void
    {
        $user=$this->createUser(true);
        $company=$user->companies()->firstOrFail();
        $company->update(['active'=>false]);
        $this->actingAs($user);
        $this->getJson("/api/companies/{$company->id}/my/workspace-preferences")
            ->assertForbidden();
    }

    public function test_enrolled_user_gets_no_sensitive_recovery_data_from_api(): void
    {
        $user=$this->createUser(true);
        $secret=app(TwoFactorAuthenticationProvider::class)->generateSecretKey();
        $user->forceFill([
            'two_factor_secret'=>encrypt($secret),
            'two_factor_recovery_codes'=>encrypt(json_encode(['private-recovery-code'])),
            'two_factor_confirmed_at'=>now(),
        ])->save();

        $this->actingAs($user);
        $data=$this->getJson('/api/me')->assertOk()->json();
        $payload=json_encode($data);
        $this->assertStringNotContainsString('private-recovery-code',$payload);
        $this->assertStringNotContainsString($secret,$payload);
    }
}
