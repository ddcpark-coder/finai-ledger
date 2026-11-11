<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AdaptiveWindowPreferencesTest extends TestCase
{
    private function user(string $email): User
    {
        $user=User::query()->create([
            'name'=>$email,'email'=>$email,'password'=>'synthetic-testing-only',
            'active'=>true,
        ]);
        $user->forceFill(['email_verified_at'=>now()])->save();
        return $user;
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name'=>$name,'active'=>true]);
    }

    private function join(User $user, Company $company): void
    {
        $roleId=DB::table('roles')->insertGetId([
            'key'=>'viewer-'.$user->id.'-'.$company->id,
            'name'=>'Viewer','system'=>true,'created_at'=>now(),'updated_at'=>now(),
        ]);
        $user->companies()->attach($company->id,[
            'role_id'=>$roleId,'status'=>'active','joined_at'=>now(),
        ]);
    }

    private function url(Company $company, string $module='incoming_invoices', string $view='Pregled::Vsi'): string
    {
        return "/api/companies/{$company->id}/my/adaptive-views/{$module}?view=".rawurlencode($view);
    }

    private function payload(int $version=0): array
    {
        return [
            'expected_version'=>$version,
            'level'=>'simple',
            'arrangement'=>'stacked',
            'detailWidth'=>420,
            'textScale'=>130,
        ];
    }

    public function test_anonymous_session_cannot_read_or_write_window_preferences(): void
    {
        $url='/api/companies/1/my/adaptive-views/banking?view=Pregled%3A%3ANapoved';
        $this->getJson($url)->assertUnauthorized();
        $this->putJson($url,$this->payload())->assertUnauthorized();
    }

    public function test_verified_member_can_save_read_and_isolate_multiple_subviews(): void
    {
        $company=$this->company('Testno podjetje A');
        $user=$this->user('a@example.test');
        $this->join($user,$company);
        $this->actingAs($user);

        $first=$this->url($company);
        $second=$this->url($company,'incoming_invoices','Odobritve::Odobreno');

        $this->getJson($first)->assertOk()
            ->assertJsonPath('data.version',0)
            ->assertJsonPath('data.settings',null);
        $this->putJson($first,$this->payload())->assertOk()
            ->assertJsonPath('data.version',1)
            ->assertJsonPath('data.settings.level','simple')
            ->assertJsonPath('data.settings.textScale',130);
        $this->getJson($first)->assertOk()
            ->assertJsonPath('data.settings.detailWidth',420);
        $this->getJson($second)->assertOk()
            ->assertJsonPath('data.version',0)
            ->assertJsonPath('data.settings',null);

        $other=$this->payload();
        $other['level']='expert';
        $other['textScale']=100;
        $this->putJson($second,$other)->assertOk()
            ->assertJsonPath('data.settings.level','expert');
        $this->getJson($first)->assertOk()
            ->assertJsonPath('data.settings.level','simple');
        $this->assertDatabaseCount('workspace_layouts',2);
    }

    public function test_company_access_is_checked_and_other_users_cannot_read_preferences(): void
    {
        $a=$this->company('A');
        $b=$this->company('B');
        $userA=$this->user('a@example.test');
        $userB=$this->user('b@example.test');
        $this->join($userA,$a);
        $this->join($userB,$a);
        $this->join($userB,$b);

        $this->actingAs($userA);
        $this->putJson($this->url($a),$this->payload())->assertOk();
        $this->getJson($this->url($b))->assertForbidden();
        $this->putJson($this->url($b),$this->payload())->assertForbidden();

        $this->actingAs($userB);
        $this->getJson($this->url($a))->assertOk()
            ->assertJsonPath('data.version',0);
        $this->putJson($this->url($b),$this->payload())->assertOk();
        $this->assertDatabaseCount('workspace_layouts',2);
    }

    public function test_stale_session_conflict_preserves_previous_window_settings(): void
    {
        $company=$this->company('A');
        $user=$this->user('a@example.test');
        $this->join($user,$company);
        $this->actingAs($user);
        $url=$this->url($company);
        $this->putJson($url,$this->payload())->assertOk();

        $stale=$this->payload(0);
        $stale['level']='expert';
        $this->putJson($url,$stale)->assertStatus(409);
        $this->getJson($url)->assertOk()
            ->assertJsonPath('data.version',1)
            ->assertJsonPath('data.settings.level','simple');
    }

    public function test_invalid_module_view_and_settings_are_rejected(): void
    {
        $company=$this->company('A');
        $user=$this->user('a@example.test');
        $this->join($user,$company);
        $this->actingAs($user);
        $url=$this->url($company);

        $this->getJson($this->url($company,'unknown_module'))->assertNotFound();
        $this->getJson("/api/companies/{$company->id}/my/adaptive-views/banking?view=")
            ->assertUnprocessable();
        $this->getJson("/api/companies/{$company->id}/my/adaptive-views/banking?view=bad%0Aview")
            ->assertUnprocessable();

        foreach ([
            ['level'=>'admin'], ['arrangement'=>'root'],['detailWidth'=>900],
            ['textScale'=>900],['expected_version'=>-1],
        ] as $bad) {
            $this->putJson($url,[...$this->payload(),...$bad])->assertUnprocessable();
        }
        $this->assertDatabaseCount('workspace_layouts',0);
    }

    public function test_inactive_user_and_suspended_membership_cannot_access_view_settings(): void
    {
        $company=$this->company('A');
        $user=$this->user('a@example.test');
        $this->join($user,$company);
        $this->actingAs($user);
        $url=$this->url($company);
        DB::table('company_user')->where('company_id',$company->id)
            ->where('user_id',$user->id)->update(['status'=>'suspended']);
        $this->getJson($url)->assertForbidden();
        DB::table('company_user')->where('company_id',$company->id)
            ->where('user_id',$user->id)->update(['status'=>'active']);
        $user->update(['active'=>false]);
        $this->putJson($url,$this->payload())->assertForbidden();
    }
}
