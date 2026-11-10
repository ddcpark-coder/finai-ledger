<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DemoIncomingInvoicesApiTest extends TestCase
{
    private function member(string $name, Company $company, array $permissions, string $role='operator'): User
    {
        $user=User::query()->create([
            'name'=>$name,
            'email'=>strtolower(str_replace(' ','-',$name)).'@example.test',
            'password'=>'synthetic-not-real-123456',
            'active'=>true,
        ]);
        $user->forceFill(['email_verified_at'=>now()])->save();
        $existing=DB::table('roles')->where('key',$role)->value('id');
        $roleId=$existing ?: DB::table('roles')->insertGetId([
            'key'=>$role,'name'=>ucfirst($role),'system'=>true,
        ]);
        foreach ($permissions as $permission) {
            $id=DB::table('permissions')->where('key',$permission)->value('id');
            if (! $id) $id=DB::table('permissions')->insertGetId([
                'key'=>$permission,'name'=>$permission
            ]);
            DB::table('permission_role')->insertOrIgnore([
                'role_id'=>$roleId,'permission_id'=>$id
            ]);
        }
        $user->companies()->attach($company->id,[
            'role_id'=>$roleId,'status'=>'active','joined_at'=>now()
        ]);
        return $user;
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name'=>$name,'active'=>true]);
    }

    private function payload(string $number='SYN-001'): array
    {
        return [
            'demo_only'=>true,
            'partner_name'=>'Sintetični dobavitelj',
            'invoice_number'=>$number,
            'gross_amount'=>'1234,56',
            'issue_date'=>'2026-11-10',
            'due_date'=>'2026-11-25',
        ];
    }

    public function test_api_is_disabled_without_opt_in_and_anonymous_users_are_rejected(): void
    {
        $this->getJson('/api/companies/1/demo/incoming-invoices')->assertUnauthorized();
        $company=$this->company('Company A');
        $user=$this->member('Demo User',$company,['invoices.write']);
        $this->actingAs($user);
        $this->postJson("/api/companies/{$company->id}/demo/incoming-invoices",
            $this->payload())->assertNotFound();
        $this->assertDatabaseCount('demo_incoming_invoices',0);
    }

    public function test_demo_invoice_is_company_scoped_and_deduplicated(): void
    {
        config()->set('finai.demo_workflows_enabled',true);
        $companyA=$this->company('Company A');
        $companyB=$this->company('Company B');
        $user=$this->member('Alice Tester',$companyA,['invoices.write','invoices.approve']);
        $other=$this->member('Bob Tester',$companyB,['invoices.write','invoices.approve']);
        $this->actingAs($user);

        $url="/api/companies/{$companyA->id}/demo/incoming-invoices";
        $this->postJson($url,$this->payload())->assertCreated()
            ->assertJsonPath('data.company_id',$companyA->id)
            ->assertJsonPath('data.status','review')
            ->assertJsonPath('demo_only',true);
        $this->assertDatabaseHas('demo_incoming_invoices',[
            'company_id'=>$companyA->id,'gross_cents'=>123456,'status'=>'review'
        ]);
        $this->postJson($url,[
            ...$this->payload(), 'partner_name'=>'  SINTETIČNI DOBAVITELJ ',
            'invoice_number'=>'  syn-001  '
        ])->assertStatus(409);
        $this->getJson($url)->assertOk()->assertJsonCount(1,'data');

        $this->getJson("/api/companies/{$companyB->id}/demo/incoming-invoices")
            ->assertForbidden();

        $this->actingAs($other);
        $this->getJson("/api/companies/{$companyB->id}/demo/incoming-invoices")
            ->assertOk()->assertJsonCount(0,'data');
        $this->postJson("/api/companies/{$companyB->id}/demo/incoming-invoices",
            $this->payload())->assertCreated();
        $this->getJson("/api/companies/{$companyB->id}/demo/incoming-invoices")
            ->assertOk()->assertJsonCount(1,'data');
        $this->assertDatabaseCount('audit_logs',2);
    }

    public function test_approval_is_audited_and_cannot_cross_company_or_repeat(): void
    {
        config()->set('finai.demo_workflows_enabled',true);
        $company=$this->company('Company A');
        $otherCompany=$this->company('Company B');
        $user=$this->member('Alice Tester',$company,['invoices.write','invoices.approve']);
        $other=$this->member('Bob Tester',$otherCompany,['invoices.write','invoices.approve']);
        $this->actingAs($user);
        $create="/api/companies/{$company->id}/demo/incoming-invoices";
        $id=$this->postJson($create,$this->payload())->json('data.id');
        $approve=$create."/{$id}/approve";

        $this->actingAs($other);
        $this->postJson($approve,['demo_only'=>true])->assertForbidden();

        $this->actingAs($user);
        $this->postJson($approve,['demo_only'=>true])->assertOk()
            ->assertJsonPath('data.status','approved');
        $this->postJson($approve,['demo_only'=>true])->assertStatus(409);

        $this->assertDatabaseHas('demo_incoming_invoices',[
            'id'=>$id,'company_id'=>$company->id,'approved_by'=>$user->id,'status'=>'approved'
        ]);
        $this->assertDatabaseHas('audit_logs',[
            'company_id'=>$company->id,'event_type'=>'demo_incoming_invoice.approved',
            'entity_type'=>'demo_incoming_invoice','entity_id'=>(string)$id
        ]);
        $this->assertDatabaseCount('audit_logs',2);
    }

    public function test_write_and_approve_permissions_are_distinct(): void
    {
        config()->set('finai.demo_workflows_enabled',true);
        $company=$this->company('Company A');
        $writer=$this->member('Writer Tester',$company,['invoices.write'],'operator');
        $this->actingAs($writer);
        $url="/api/companies/{$company->id}/demo/incoming-invoices";
        $id=$this->postJson($url,$this->payload())->assertCreated()->json('data.id');
        $this->postJson($url."/{$id}/approve",['demo_only'=>true])->assertForbidden();
        $this->assertDatabaseHas('demo_incoming_invoices',['id'=>$id,'status'=>'review']);
    }

    public function test_rejects_real_data_flag_bad_money_and_bad_dates(): void
    {
        config()->set('finai.demo_workflows_enabled',true);
        $company=$this->company('Company A');
        $user=$this->member('Alice Tester',$company,['invoices.write']);
        $this->actingAs($user);
        $url="/api/companies/{$company->id}/demo/incoming-invoices";

        foreach ([
            ['demo_only'=>false],['gross_amount'=>'1.234,56'],
            ['gross_amount'=>'0'],['gross_amount'=>'9999999'],
            ['issue_date'=>'not-a-date'],['due_date'=>'2026-01-01'],
        ] as $bad) {
            $this->postJson($url,[...$this->payload(),...$bad])->assertUnprocessable();
        }
        $this->assertDatabaseCount('demo_incoming_invoices',0);
        $this->assertDatabaseCount('audit_logs',0);
    }
}
