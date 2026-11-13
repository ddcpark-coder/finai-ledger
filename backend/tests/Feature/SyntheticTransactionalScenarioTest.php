<?php

namespace Tests\Feature;

use App\Domain\Accounting\BalanceCalculator;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class SyntheticTransactionalScenarioTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Only synthetic tables are migrated here; never touch legacy finance schema.
        $this->artisan('migrate', [
            '--path' => 'database/migrations/2026_11_13_000022_create_synthetic_ledger_scenarios.php',
            '--force' => true,
        ])->run();
    }

    private function company(string $label): Company
    {
        return Company::query()->create(['name' => $label, 'active' => true]);
    }

    private function member(Company $company, string $name, bool $canPost = true): User
    {
        $user = User::query()->create([
            'name' => $name,
            'email' => strtolower(str_replace(' ', '-', $name)).'@example.test',
            'password' => 'synthetic-not-real-password',
            'active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $role = DB::table('roles')->insertGetId([
            'key' => 'synthetic-'.$user->id, 'name' => 'Synthetic tester', 'system' => true,
        ]);
        if ($canPost) {
            $permission = DB::table('permissions')->where('key', 'accounting.post')->value('id');
            if (! $permission) {
                $permission = DB::table('permissions')->insertGetId([
                    'key' => 'accounting.post', 'name' => 'Post synthetic accounting events',
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id' => $role, 'permission_id' => $permission,
            ]);
        }
        $user->companies()->attach($company->id, [
            'role_id' => $role, 'status' => 'active', 'joined_at' => now(),
        ]);
        return $user;
    }

    private function url(Company $company): string
    {
        return '/api/companies/'.$company->id.'/demo/ledger-scenario';
    }

    private function payload(string $action, int $version, string $uuid): array
    {
        return [
            'demo_only' => true, 'action' => $action,
            'expected_version' => $version, 'event_id' => $uuid,
        ];
    }

    private function event(int $step): string
    {
        return sprintf('1069a8cb-93c6-4a6f-8a8c-5fb138f7a8%02d', $step);
    }

    public function test_api_is_disabled_by_default_and_requires_session(): void
    {
        $company = $this->company('Company A');
        $this->getJson($this->url($company))->assertUnauthorized();
        $this->actingAs($this->member($company, 'Alice'));
        $this->getJson($this->url($company))->assertNotFound();
        $this->postJson($this->url($company).'/events',
            $this->payload('reserve', 0, $this->event(1)))->assertNotFound();
        $this->assertDatabaseCount('synthetic_ledger_scenarios', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_full_flow_is_atomic_balanced_audited_and_idempotent(): void
    {
        config()->set('finai.synthetic_ledger_scenario_enabled', true);
        $company = $this->company('Company A');
        $this->actingAs($this->member($company, 'Alice'));
        $url = $this->url($company);
        $this->getJson($url)->assertOk()
            ->assertJsonPath('data.state', 'draft')
            ->assertJsonPath('data.version', 0)
            ->assertJsonPath('data.inventory.on_hand', 12)
            ->assertJsonPath('data.invoice.gross_cents', 12200)
            ->assertJsonPath('data.real_posting_enabled', false);
        $this->assertDatabaseCount('synthetic_ledger_scenarios', 0);

        $actions = ['reserve', 'deliver', 'invoice', 'reverse_invoice'];
        foreach ($actions as $idx => $action) {
            $this->postJson($url.'/events',
                $this->payload($action, $idx, $this->event($idx+1)))
                ->assertOk()->assertJsonPath('data.version', $idx+1)
                ->assertJsonPath('data.demo_only', true)
                ->assertJsonPath('data.replayed', false);
        }
        $response = $this->getJson($url)->assertOk()
            ->assertJsonPath('data.state', 'invoice_reversed')
            ->assertJsonPath('data.inventory.on_hand', 9)
            ->assertJsonPath('data.inventory.reserved', 0)
            ->assertJsonPath('data.inventory.dispatched', 3)
            ->assertJsonCount(4, 'data.events');
        $events = $response->json('data.events');
        $this->assertSame(['on_hand'=>0,'reserved'=>3,'dispatched'=>0],
            $events[0]['stock_movement']);
        $this->assertSame(['on_hand'=>-3,'reserved'=>-3,'dispatched'=>3],
            $events[1]['stock_movement']);
        $this->assertSame([
            ['account'=>'1200','debit_cents'=>12200,'credit_cents'=>0],
            ['account'=>'7600','debit_cents'=>0,'credit_cents'=>10000],
            ['account'=>'2600','debit_cents'=>0,'credit_cents'=>2200],
        ], $events[2]['journal_lines']);
        $this->assertSame(12200,
            array_sum(array_column($events[2]['journal_lines'], 'debit_cents')));
        $this->assertSame(12200,
            array_sum(array_column($events[2]['journal_lines'], 'credit_cents')));
        $this->assertSame(12200,
            array_sum(array_column($events[3]['journal_lines'], 'debit_cents')));
        $this->assertSame(12200,
            array_sum(array_column($events[3]['journal_lines'], 'credit_cents')));
        $this->assertDatabaseCount('synthetic_ledger_events', 4);
        $this->assertDatabaseCount('audit_logs', 4);
        $this->postJson($url.'/events',
            $this->payload('reserve', 0, $this->event(1)))->assertOk()
            ->assertJsonPath('data.replayed', true)->assertJsonPath('data.version', 4);
        $this->assertDatabaseCount('synthetic_ledger_events', 4);
        $this->assertDatabaseCount('audit_logs', 4);
        $this->postJson($url.'/events',
            $this->payload('deliver', 0, $this->event(1)))->assertStatus(409);
    }

    public function test_illegal_order_stale_revision_and_invalid_payload_never_write(): void
    {
        config()->set('finai.synthetic_ledger_scenario_enabled', true);
        $company = $this->company('Company A');
        $this->actingAs($this->member($company, 'Alice'));
        $url = $this->url($company);
        $this->postJson($url.'/events',
            $this->payload('deliver', 0, $this->event(1)))->assertStatus(409);
        $this->postJson($url.'/events',
            [...$this->payload('reserve', 0, $this->event(1)), 'demo_only'=>false])
            ->assertUnprocessable();
        $this->postJson($url.'/events',
            $this->payload('invoice', 0, 'invalid-event'))->assertUnprocessable();
        $this->assertDatabaseCount('synthetic_ledger_scenarios', 0);
        $this->postJson($url.'/events',
            $this->payload('reserve', 0, $this->event(1)))->assertOk();
        $this->postJson($url.'/events',
            $this->payload('deliver', 0, $this->event(2)))->assertStatus(409);
        $this->postJson($url.'/events',
            $this->payload('invoice', 1, $this->event(3)))->assertStatus(409);
        $this->assertDatabaseHas('synthetic_ledger_scenarios',[
            'company_id'=>$company->id, 'state'=>'reserved',
            'version'=>1, 'stock_on_hand'=>12, 'stock_reserved'=>3,
        ]);
        $this->assertDatabaseCount('synthetic_ledger_events', 1);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_company_and_user_isolation_and_write_permission(): void
    {
        config()->set('finai.synthetic_ledger_scenario_enabled', true);
        $a = $this->company('Company A');
        $b = $this->company('Company B');
        $alice = $this->member($a, 'Alice', true);
        $bob = $this->member($b, 'Bob', true);
        $viewer = $this->member($a, 'Viewer', false);
        $this->actingAs($alice);
        $this->postJson($this->url($a).'/events',
            $this->payload('reserve', 0, $this->event(1)))->assertOk();
        $this->getJson($this->url($b))->assertForbidden();
        $this->postJson($this->url($b).'/events',
            $this->payload('reserve', 0, $this->event(2)))->assertForbidden();
        $this->actingAs($viewer);
        $this->getJson($this->url($a))->assertOk()->assertJsonPath('data.version', 0);
        $this->postJson($this->url($a).'/events',
            $this->payload('reserve', 0, $this->event(3)))->assertForbidden();
        $this->actingAs($bob);
        $this->getJson($this->url($a))->assertForbidden();
        $this->postJson($this->url($b).'/events',
            $this->payload('reserve', 0, $this->event(1)))->assertOk();
        $this->getJson($this->url($b))->assertOk()->assertJsonPath('data.version', 1);
        $this->assertDatabaseCount('synthetic_ledger_scenarios', 2);
        $this->assertDatabaseCount('synthetic_ledger_events', 2);
        $this->assertDatabaseCount('audit_logs', 2);
    }

    public function test_forced_failure_rolls_back_scenario_event_and_audit_together(): void
    {
        config()->set('finai.synthetic_ledger_scenario_enabled', true);
        config()->set('finai.synthetic_ledger_test_fail_after_event', true);
        $company = $this->company('Company A');
        $this->actingAs($this->member($company, 'Alice'));
        $url = $this->url($company).'/events';
        $this->postJson($url,
            $this->payload('reserve', 0, $this->event(1)))->assertStatus(500);
        $this->assertDatabaseCount('synthetic_ledger_scenarios', 0);
        $this->assertDatabaseCount('synthetic_ledger_events', 0);
        $this->assertDatabaseCount('audit_logs', 0);
        config()->set('finai.synthetic_ledger_test_fail_after_event', false);
        $this->postJson($url,
            $this->payload('reserve', 0, $this->event(1)))->assertOk();
        $this->assertDatabaseCount('synthetic_ledger_scenarios', 1);
        $this->assertDatabaseCount('synthetic_ledger_events', 1);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_money_precision_rejects_unbalanced_and_three_decimal_entries(): void
    {
        $this->expectException(\DomainException::class);
        BalanceCalculator::assertBalanced([
            ['debit'=>'122.00','credit'=>'0.00'],
            ['debit'=>'0.00','credit'=>'121.99'],
        ]);
    }
}
