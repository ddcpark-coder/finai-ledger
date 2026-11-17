<?php

namespace Tests\Feature;

use App\Application\CRM\SyntheticCrmPipeline;
use App\Application\Integrations\StageSyntheticCommerceOrder;
use App\Application\Integrations\UnifiedSyntheticBusinessGraph;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class Next22UnifiedBusinessGraphTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // ONLY in-memory SQLite; no Hiper M, production, shared DB or real data.
        Schema::create('warehouses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->boolean('active')->default(true);
        });
        foreach ([
            '2026_11_14_000023_create_business_units_and_commerce_inbox.php',
            '2026_11_15_000024_create_synthetic_crm_opportunities.php',
            '2026_11_17_000026_create_synthetic_stock_plans.php',
        ] as $migration) {
            $this->artisan('migrate', [
                '--path' => 'database/migrations/'.$migration,
                '--force' => true,
            ])->run();
        }
    }

    private function enableGraph(): void
    {
        config()->set('finai.synthetic_business_graph_enabled', true);
        config()->set('finai.synthetic_crm_persistence_enabled', true);
        config()->set('finai.synthetic_commerce_staging_enabled', true);
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name' => $name, 'active' => true]);
    }

    private function actor(Company $company, string $login,
        array $permissions): User
    {
        $user = User::query()->create([
            'name' => $login, 'email' => $login.'@example.test',
            'password' => 'SYNTHETIC-ONLY-NOT-A-LOGIN', 'active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $role = DB::table('roles')->insertGetId([
            'key' => 'graph-'.$user->id, 'name' => 'Synthetic graph QA',
            'system' => true,
        ]);
        foreach ($permissions as $key) {
            $id = DB::table('permissions')->where('key', $key)->value('id');
            if (! $id) {
                $id = DB::table('permissions')->insertGetId([
                    'key' => $key, 'name' => $key,
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id' => $role, 'permission_id' => $id,
            ]);
        }
        $user->companies()->attach($company->id, [
            'role_id' => $role, 'status' => 'active', 'joined_at' => now(),
        ]);
        return $user;
    }

    private function unit(Company $company): int
    {
        return DB::table('business_units')->insertGetId([
            'company_id' => $company->id, 'code' => 'PE-01',
            'name' => 'Sintetična poslovna enota',
            'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function warehouse(Company $company): int
    {
        return DB::table('warehouses')->insertGetId([
            'company_id' => $company->id, 'active' => true,
        ]);
    }

    private function seed(Company $company, User $actor,
        string $provider = 'shopify'): array
    {
        $this->unit($company);
        $source = $this->warehouse($company);
        $target = $this->warehouse($company);
        $connection = DB::table('commerce_connections')->insertGetId([
            'company_id' => $company->id, 'code' => 'SYN-CONN',
            'provider' => $provider, 'status' => 'draft',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('commerce_sku_mappings')->insert([
            'company_id' => $company->id, 'connection_id' => $connection,
            'external_sku' => 'SYN-TAB-10070',
            'internal_sku' => 'SYN-TAB-10070',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $crm = app(SyntheticCrmPipeline::class)->register($company->id,
            $actor->id, [
                'demoOnly' => true, 'dealId' => 'SYN-CRM-101',
                'unitCode' => 'PE-01', 'initialStage' => 'qualification',
                'valueCents' => 25000,
            ]);
        $order = app(StageSyntheticCommerceOrder::class)->execute(
            $company->id, $actor->id, [
                'demoOnly' => true, 'companyId' => $company->id,
                'provider' => $provider, 'connectionCode' => 'SYN-CONN',
                'warehouseId' => $target,
                'eventId' => 'SYN-DEMO-EVENT-001',
                'externalOrderId' => 'SYN-DEMO-ORDER-001',
                'currency' => 'EUR',
                'lines' => [[
                    'sku' => 'SYN-TAB-10070',
                    'quantity' => 2, 'unitPriceCents' => 12500,
                ]],
                'totalCents' => 25000,
            ]);
        return [$source, $target, (int) $order['id'], $crm];
    }

    private function command(int $source, int $target, int $orderId): array
    {
        return [
            'demoOnly' => true, 'eventId' => 'SYN-PLAN-001',
            'sourceWarehouseId' => $source,
            'targetWarehouseId' => $target,
            'commerceOrderId' => $orderId,
            'crmDealId' => 'SYN-CRM-101',
            'sku' => 'SYN-TAB-10070', 'quantity' => 2,
        ];
    }

    private function permissions(): array
    {
        return [
            'crm.read', 'crm.write', 'orders.read', 'orders.write',
            'inventory.read', 'inventory.write',
        ];
    }

    private function url(Company $company): string
    {
        return "/api/companies/{$company->id}/demo/business-graph";
    }

    public function test_requires_verified_session_permissions_and_off_by_default(): void
    {
        $company = $this->company('A');
        $this->getJson($this->url($company))->assertUnauthorized();
        $user = $this->actor($company, 'admin', $this->permissions());
        $this->actingAs($user);
        $this->getJson($this->url($company))->assertNotFound();
        $this->postJson($this->url($company).'/stock-plans',
            $this->command(1, 2, 1))->assertNotFound();
        $this->enableGraph();
        $this->getJson($this->url($company))->assertOk()
            ->assertJsonPath('data.demo_only', true)
            ->assertJsonPath('data.read_only', true)
            ->assertJsonPath('data.posting', false);
        $this->getJson($this->url($company).'?limit=51')
            ->assertUnprocessable();

        $none = $this->actor($company, 'viewer', []);
        $this->actingAs($none);
        $this->getJson($this->url($company))->assertForbidden();

        $this->actingAs($user);
        config()->set('finai.synthetic_crm_persistence_enabled', false);
        $this->getJson($this->url($company))->assertNotFound();
        config()->set('finai.synthetic_crm_persistence_enabled', true);
        config()->set('finai.synthetic_commerce_staging_enabled', false);
        $this->getJson($this->url($company))->assertNotFound();
    }

    public function test_atomic_linked_synthetic_plan_and_canonical_refs_are_company_scoped(): void
    {
        $this->enableGraph();
        $a = $this->company('A');
        $b = $this->company('B');
        $alice = $this->actor($a, 'alice', $this->permissions());
        $bob = $this->actor($b, 'bob', $this->permissions());
        [$fromA, $toA, $orderA] = $this->seed($a, $alice);
        [$fromB, $toB, $orderB] = $this->seed($b, $bob);
        $this->actingAs($alice);
        $url = $this->url($a);
        $first = $this->postJson($url.'/stock-plans',
            $this->command($fromA, $toA, $orderA))
            ->assertCreated()->assertJsonPath('data.demo_only', true)
            ->assertJsonPath('data.posting', false)
            ->assertJsonPath('data.inventory_reserved', false)
            ->json('data');
        $this->assertSame('SYN:C'.$a->id.':ORDER:'.$orderA, $first['order_ref']);
        $this->assertStringStartsWith('SYN:C'.$a->id.':CRM:', $first['crm_ref']);
        $this->assertStringStartsWith('SYN:C'.$a->id.':PLAN:', $first['ref']);
        $this->assertStringStartsWith('SYN:C'.$a->id.':AUDIT:', $first['audit_ref']);

        $snapshot = $this->getJson($url)->assertOk()
            ->assertJsonCount(1, 'data.orders')
            ->assertJsonCount(1, 'data.crm')
            ->assertJsonCount(1, 'data.stock_plans')
            ->assertJsonCount(3, 'data.audit')
            ->json('data');
        $this->assertSame($first['ref'], $snapshot['stock_plans'][0]['ref']);
        $all = array_column([
            ...$snapshot['orders'], ...$snapshot['crm'],
            ...$snapshot['stock_plans']], 'ref');
        foreach ($snapshot['audit'] as $audit) {
            $this->assertContains($audit['entity_ref'], $all);
            $this->assertStringStartsWith('SYN:C'.$a->id.':AUDIT:', $audit['ref']);
        }
        $this->assertFalse(Schema::hasTable('inventory_movements'));
        $this->assertDatabaseCount('synthetic_stock_plans', 1);
        $this->assertDatabaseCount('audit_logs', 5); // 2 CRM + 2 orders + 1 plan

        $this->getJson($this->url($b))->assertForbidden();
        $this->actingAs($bob);
        $other = $this->getJson($this->url($b))->assertOk()
            ->assertJsonCount(0, 'data.stock_plans')->json('data');
        $this->assertSame('SYN:C'.$b->id.':ORDER:'.$orderB, $other['orders'][0]['ref']);
        $this->assertNotSame($first['order_ref'], $other['orders'][0]['ref']);
    }

    public function test_replay_is_idempotent_tampering_fails_and_does_not_post(): void
    {
        $this->enableGraph();
        $a = $this->company('A');
        $actor = $this->actor($a, 'alice', $this->permissions());
        [$source, $target, $order] = $this->seed($a, $actor);
        $input = $this->command($source, $target, $order);
        $this->actingAs($actor);
        $url = $this->url($a).'/stock-plans';
        $original = $this->postJson($url, $input)->assertCreated()->json('data');
        $again = $this->postJson($url, $input)->assertOk()->json('data');
        $this->assertSame($original['ref'], $again['ref']);
        $this->assertTrue($again['replayed']);
        foreach ([
            ['quantity' => 1],
            ['sku' => 'SYN-OTHER'],
            ['eventId' => 'REAL-PLAN'],
            ['targetWarehouseId' => $source],
            ['customer_email' => 'somebody@example.test'],
            ['posting' => true], ['amount' => 20.0],
            ['commerceOrderId' => 9999],
            ['crmDealId' => 'SYN-CRM-999'],
        ] as $change) {
            $this->postJson($url, [...$input, ...$change])
                ->assertStatus(409);
        }
        $this->assertDatabaseCount('synthetic_stock_plans', 1);
        $this->assertDatabaseCount('audit_logs', 3);
    }

    public function test_cross_company_foreign_links_and_permission_revocation_are_denied(): void
    {
        $this->enableGraph();
        $a = $this->company('A');
        $b = $this->company('B');
        $alice = $this->actor($a, 'alice', $this->permissions());
        $bob = $this->actor($b, 'bob', $this->permissions());
        [$srcA, $dstA, $orderA] = $this->seed($a, $alice);
        [$srcB, $dstB, $orderB] = $this->seed($b, $bob);

        $this->actingAs($alice);
        $url = $this->url($a);
        foreach ([
            $this->command($srcB, $dstA, $orderA),
            $this->command($srcA, $dstB, $orderA),
            $this->command($srcA, $dstA, $orderB),
        ] as $cmd) {
            $this->postJson($url.'/stock-plans', $cmd)->assertStatus(409);
        }
        $this->assertDatabaseCount('synthetic_stock_plans', 0);
        $this->actingAs($bob);
        $this->getJson($url)->assertForbidden();
        $this->postJson($url.'/stock-plans',
            $this->command($srcA, $dstA, $orderA))->assertForbidden();

        DB::table('company_user')->where('company_id', $a->id)
            ->where('user_id', $alice->id)->update(['status' => 'revoked']);
        $this->actingAs($alice);
        $this->getJson($url)->assertForbidden();
        $this->postJson($url.'/stock-plans',
            $this->command($srcA, $dstA, $orderA))->assertForbidden();
    }

    public function test_corruption_denies_read_and_atomic_audit_failure_rolls_back(): void
    {
        $this->enableGraph();
        $company = $this->company('A');
        $alice = $this->actor($company, 'alice', $this->permissions());
        [$src, $dst, $orderId] = $this->seed($company, $alice);
        $this->actingAs($alice);
        $url = $this->url($company);
        $input = $this->command($src, $dst, $orderId);
        $this->postJson($url.'/stock-plans', $input)->assertCreated();
        DB::table('synthetic_stock_plans')->update(['quantity' => 999]);
        $this->getJson($url)->assertStatus(409);
        DB::table('synthetic_stock_plans')->delete();
        DB::table('audit_logs')->delete();
        Schema::drop('audit_logs'); // Ephemeral in-memory DB only.
        try {
            app(UnifiedSyntheticBusinessGraph::class)->recordPlan(
                $company->id, $alice->id, [
                    ...$input, 'eventId' => 'SYN-PLAN-002',
                ]);
            $this->fail('Missing audit must roll back stock plan.');
        } catch (\Illuminate\Database\QueryException) {
            $this->assertDatabaseCount('synthetic_stock_plans', 0);
        }
    }
}
