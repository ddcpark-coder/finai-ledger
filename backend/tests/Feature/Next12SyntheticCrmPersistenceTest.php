<?php

namespace Tests\Feature;

use App\Application\CRM\SyntheticCrmPipeline;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class Next12SyntheticCrmPersistenceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // All fixtures and migrations run ONLY in ephemeral SQLite :memory:.
        Schema::create('warehouses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->boolean('active')->default(true);
        });
        foreach ([
            '2026_11_14_000023_create_business_units_and_commerce_inbox.php',
            '2026_11_15_000024_create_synthetic_crm_opportunities.php',
        ] as $migration) {
            $this->artisan('migrate', [
                '--path' => 'database/migrations/' . $migration,
                '--force' => true,
            ])->run();
        }
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name' => $name, 'active' => true]);
    }

    private function actor(Company $company, string $name, array $permissions): User
    {
        $user = User::query()->create([
            'name' => $name,
            'email' => strtolower($name) . '@example.test',
            'password' => 'not-a-real-password',
            'active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $roleId = DB::table('roles')->insertGetId([
            'key' => 'next12-' . $user->id,
            'name' => 'Synthetic CRM QA role',
            'system' => true,
        ]);
        foreach ($permissions as $permission) {
            $id = DB::table('permissions')->where('key', $permission)->value('id');
            if (! $id) {
                $id = DB::table('permissions')->insertGetId([
                    'key' => $permission, 'name' => $permission,
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id' => $roleId, 'permission_id' => $id,
            ]);
        }
        $user->companies()->attach($company->id, [
            'role_id' => $roleId, 'status' => 'active', 'joined_at' => now(),
        ]);
        return $user;
    }

    private function unit(Company $company, string $code = 'PE-01'): int
    {
        return DB::table('business_units')->insertGetId([
            'company_id' => $company->id,
            'code' => $code,
            'name' => 'Synthetic business unit',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function payload(): array
    {
        return [
            'demoOnly' => true, 'dealId' => 'SYN-CRM-101',
            'unitCode' => 'PE-01', 'initialStage' => 'qualification',
            'valueCents' => 1250000,
        ];
    }

    private function url(Company $company): string
    {
        return "/api/companies/{$company->id}/demo/crm/opportunities";
    }

    public function test_disabled_by_default_and_anonymous_session_cannot_access(): void
    {
        $this->getJson('/api/companies/1/demo/crm/opportunities')->assertUnauthorized();
        $company = $this->company('Company A');
        $user = $this->actor($company, 'alice', ['crm.read', 'crm.write']);
        $this->unit($company);
        $this->actingAs($user);
        $this->getJson($this->url($company))->assertNotFound();
        $this->postJson($this->url($company), $this->payload())->assertNotFound();
        $this->assertDatabaseCount('synthetic_crm_opportunities', 0);
    }

    public function test_persisted_deals_are_company_scoped_and_replay_does_not_reset_stage(): void
    {
        config()->set('finai.synthetic_crm_persistence_enabled', true);
        $a = $this->company('Company A');
        $b = $this->company('Company B');
        $alice = $this->actor($a, 'alice', ['crm.read', 'crm.write']);
        $bob = $this->actor($b, 'bob', ['crm.read', 'crm.write']);
        $this->unit($a);
        $this->unit($b);

        $this->actingAs($alice);
        $url = $this->url($a);
        $this->postJson($url, $this->payload())->assertCreated()
            ->assertJsonPath('data.stage', 'qualification')
            ->assertJsonPath('data.version', 1);
        $this->postJson($url . '/SYN-CRM-101/advance', [
            'demo_only' => true, 'expected_version' => 1,
            'next_stage' => 'discovery',
        ])->assertOk()->assertJsonPath('data.version', 2);
        $this->postJson($url, $this->payload())->assertOk()
            ->assertJsonPath('data.replayed', true)
            ->assertJsonPath('data.stage', 'discovery');
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.version', 2);
        $this->getJson($this->url($b))->assertForbidden();

        $this->actingAs($bob);
        $this->getJson($this->url($b))->assertOk()->assertJsonCount(0, 'data');
        $this->postJson($this->url($b), $this->payload())->assertCreated();
        $this->getJson($this->url($b))->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.company_id', $b->id);
        $this->assertDatabaseCount('synthetic_crm_opportunities', 2);
        $this->assertDatabaseCount('audit_logs', 3);
    }

    public function test_permission_checks_and_invalid_payload_are_fail_closed(): void
    {
        config()->set('finai.synthetic_crm_persistence_enabled', true);
        $a = $this->company('Company A');
        $b = $this->company('Company B');
        $reader = $this->actor($a, 'reader', ['crm.read']);
        $writer = $this->actor($a, 'writer', ['crm.write']);
        $outsider = $this->actor($b, 'outsider', ['crm.write', 'crm.read']);
        $this->unit($a);
        $this->unit($b);
        $url = $this->url($a);

        $this->actingAs($reader);
        $this->getJson($url)->assertOk();
        $this->postJson($url, $this->payload())->assertForbidden();

        $this->actingAs($writer);
        $this->getJson($url)->assertForbidden();
        foreach ([
            ['demoOnly' => false],
            ['dealId' => 'REAL-CRM-1'],
            ['valueCents' => 12.5],
            ['unitCode' => 'PE-OTHER'],
            ['customerEmail' => 'person@example.test'],
        ] as $invalid) {
            $this->postJson($url, [...$this->payload(), ...$invalid])
                ->assertStatus(in_array('valueCents', array_keys($invalid), true) ? 422 : 409);
        }
        $this->actingAs($outsider);
        $this->postJson($url, $this->payload())->assertForbidden();
        $this->assertDatabaseCount('synthetic_crm_opportunities', 0);
    }

    public function test_stage_transition_rejects_stale_version_skips_and_payload_changes(): void
    {
        config()->set('finai.synthetic_crm_persistence_enabled', true);
        $company = $this->company('Company A');
        $user = $this->actor($company, 'alice', ['crm.read', 'crm.write']);
        $this->unit($company);
        $this->actingAs($user);
        $url = $this->url($company);
        $this->postJson($url, $this->payload())->assertCreated();

        $this->postJson($url, [...$this->payload(), 'valueCents' => 999])
            ->assertStatus(409);
        $this->postJson($url . '/SYN-CRM-101/advance', [
            'demo_only' => true, 'expected_version' => 1,
            'next_stage' => 'proposal',
        ])->assertStatus(409);
        $this->postJson($url . '/SYN-CRM-101/advance', [
            'demo_only' => true, 'expected_version' => 1,
            'next_stage' => 'discovery',
        ])->assertOk();
        $this->postJson($url . '/SYN-CRM-101/advance', [
            'demo_only' => true, 'expected_version' => 1,
            'next_stage' => 'discovery',
        ])->assertStatus(409);
        $this->assertDatabaseHas('synthetic_crm_opportunities', [
            'company_id' => $company->id,
            'deal_id' => 'SYN-CRM-101',
            'stage' => 'discovery',
            'version' => 2,
        ]);
        $this->assertDatabaseCount('audit_logs', 2);
    }

    public function test_failed_audit_write_rolls_back_registration(): void
    {
        config()->set('finai.synthetic_crm_persistence_enabled', true);
        $company = $this->company('Company A');
        $actor = $this->actor($company, 'alice', ['crm.write']);
        $this->unit($company);
        Schema::drop('audit_logs');
        try {
            app(SyntheticCrmPipeline::class)->register(
                $company->id, $actor->id, $this->payload());
            $this->fail('Missing atomic audit log must reject this operation.');
        } catch (\Illuminate\Database\QueryException $error) {
            $this->assertDatabaseCount('synthetic_crm_opportunities', 0);
        }
    }
}
