<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class WorkspacePreferencesTest extends TestCase
{
    private function user(string $email, bool $verified=true, bool $active=true): User
    {
        return User::query()->create([
            'name' => $email,
            'email' => $email,
            'password' => 'dev-test-password-please-change',
            'email_verified_at' => $verified ? now() : null,
            'active' => $active,
        ])->forceFill([
            'email_verified_at' => $verified ? now() : null,
        ])->tap(fn (User $user) => $user->save());
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name'=>$name, 'active'=>true]);
    }

    private function join(User $user, Company $company, string $status='active'): void
    {
        $roleId=DB::table('roles')->insertGetId([
            'key' => 'viewer-'.$user->id.'-'.$company->id,
            'name' => 'Viewer',
            'system' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $user->companies()->attach($company->id, [
            'role_id'=>$roleId, 'status'=>$status, 'joined_at'=>now(),
        ]);
    }

    private function payload(int $version=0): array
    {
        return [
            'expected_version'=>$version,
            'last_route'=>[
                'module'=>'vat','view'=>'DDV-O','subview'=>'Izračun',
            ],
            'favorites'=>[
                ['module'=>'vat','view'=>'DDV-O','subview'=>'Izračun'],
            ],
            'appearance'=>['theme'=>'dark','density'=>'compact'],
        ];
    }

    public function test_unauthenticated_api_is_rejected(): void
    {
        $this->getJson('/api/companies/1/my/workspace-preferences')->assertUnauthorized();
        $this->putJson('/api/companies/1/my/workspace-preferences', $this->payload())
            ->assertUnauthorized();
    }

    public function test_verified_member_can_read_and_save_own_preferences(): void
    {
        $user=$this->user('one@example.test');
        $company=$this->company('Company A');
        $this->join($user,$company);

        $this->actingAs($user);
        $endpoint="/api/companies/{$company->id}/my/workspace-preferences";
        $this->getJson($endpoint)->assertOk()
            ->assertJsonPath('data.version',0)
            ->assertJsonPath('data.favorites',[]);

        $this->putJson($endpoint,$this->payload())->assertOk()
            ->assertJsonPath('data.version',1)
            ->assertJsonPath('data.last_route.subview','Izračun');

        $this->getJson($endpoint)->assertOk()
            ->assertJsonPath('data.appearance.density','compact');
    }

    public function test_cross_company_and_cross_user_access_is_denied(): void
    {
        $user=$this->user('one@example.test');
        $other=$this->user('two@example.test');
        $companyA=$this->company('Company A');
        $companyB=$this->company('Company B');

        $this->join($user,$companyA);
        $this->join($other,$companyA);
        $this->join($other,$companyB);

        $this->actingAs($user);
        $this->getJson("/api/companies/{$companyB->id}/my/workspace-preferences")
            ->assertForbidden();
        $this->putJson("/api/companies/{$companyB->id}/my/workspace-preferences",
            $this->payload())->assertForbidden();

        $this->putJson("/api/companies/{$companyA->id}/my/workspace-preferences",
            $this->payload())->assertOk();

        $this->actingAs($other);
        $this->getJson("/api/companies/{$companyA->id}/my/workspace-preferences")
            ->assertOk()->assertJsonPath('data.version',0);
    }

    public function test_suspended_membership_and_inactive_company_are_rejected(): void
    {
        $user=$this->user('one@example.test');
        $suspended=$this->company('Suspended');
        $inactive=$this->company('Inactive');
        $this->join($user,$suspended,'suspended');
        $this->join($user,$inactive);
        $inactive->update(['active'=>false]);

        $this->actingAs($user);
        $this->getJson("/api/companies/{$suspended->id}/my/workspace-preferences")
            ->assertForbidden();
        $this->getJson("/api/companies/{$inactive->id}/my/workspace-preferences")
            ->assertForbidden();
    }

    public function test_unverified_or_inactive_account_cannot_access_preferences(): void
    {
        $user=$this->user('unverified@example.test',false);
        $company=$this->company('Private');
        $this->join($user,$company);
        $this->actingAs($user);
        $this->getJson("/api/companies/{$company->id}/my/workspace-preferences")
            ->assertForbidden();

        $user->forceFill(['email_verified_at'=>now(),'active'=>false])->save();
        $this->getJson("/api/companies/{$company->id}/my/workspace-preferences")
            ->assertForbidden();
    }

    public function test_version_conflict_does_not_overwrite_other_session(): void
    {
        $user=$this->user('one@example.test');
        $company=$this->company('Company A');
        $this->join($user,$company);
        $this->actingAs($user);
        $endpoint="/api/companies/{$company->id}/my/workspace-preferences";
        $this->putJson($endpoint,$this->payload(0))->assertOk();

        $stale=$this->payload(0);
        $stale['appearance']['theme']='light';
        $this->putJson($endpoint,$stale)->assertStatus(409);
        $this->getJson($endpoint)->assertOk()
            ->assertJsonPath('data.version',1)
            ->assertJsonPath('data.appearance.theme','dark');
    }

    public function test_invalid_payload_or_more_than_eight_favorites_is_rejected(): void
    {
        $user=$this->user('one@example.test');
        $company=$this->company('Company A');
        $this->join($user,$company);
        $this->actingAs($user);
        $endpoint="/api/companies/{$company->id}/my/workspace-preferences";

        $tooMany=$this->payload();
        $tooMany['favorites']=array_fill(0,9,[
            'module'=>'vat','view'=>'DDV-O','subview'=>'Izračun'
        ]);
        $this->putJson($endpoint,$tooMany)->assertUnprocessable();

        $invalid=$this->payload();
        $invalid['last_route']['module']='not_a_real_module';
        $this->putJson($endpoint,$invalid)->assertUnprocessable();

        $missingVersion=$this->payload();
        unset($missingVersion['expected_version']);
        $this->putJson($endpoint,$missingVersion)->assertUnprocessable();
    }

    public function test_login_requires_correct_password_and_verified_email(): void
    {
        $this->user('verified@example.test');
        $this->postJson('/auth/login',[
            'email'=>'verified@example.test','password'=>'wrong-password',
        ])->assertUnprocessable();

        $this->postJson('/auth/login',[
            'email'=>'verified@example.test',
            'password'=>'dev-test-password-please-change',
        ])->assertOk()->assertJsonPath('data.name','verified@example.test');

        $this->postJson('/auth/logout')->assertOk();
    }
}
