<?php

namespace Tests\Feature;

use App\Application\Accounting\PreviewSyntheticDraftJournal;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class SyntheticJournalPreviewTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Only the disposable SQLite :memory: schema, never a host database.
        $this->artisan('migrate', [
            '--path' => 'database/migrations/2026_11_01_000002_create_accounting_core_tables.php',
            '--force' => true,
        ])->run();
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name' => $name, 'active' => true]);
    }

    private function member(Company $company, string $name, bool $writer = true): User
    {
        $user = User::query()->create([
            'name' => $name, 'email' => $name.'@example.test',
            'password' => 'synthetic-fixture-not-for-login', 'active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $role = DB::table('roles')->insertGetId([
            'key' => 'preview-'.$user->id, 'name' => 'Preview synthetic role',
            'system' => true,
        ]);
        if ($writer) {
            $permission = DB::table('permissions')->where('key', 'ledger.post')->value('id');
            if (! $permission) {
                $permission = DB::table('permissions')->insertGetId([
                    'key' => 'ledger.post', 'name' => 'Post journal',
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

    private function fixture(Company $company, User $author): array
    {
        $year = DB::table('fiscal_years')->insertGetId([
            'company_id' => $company->id, 'year' => 2026,
            'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31',
            'status' => 'open', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $period = DB::table('accounting_periods')->insertGetId([
            'fiscal_year_id' => $year, 'period_no' => 11,
            'starts_on' => '2026-11-01', 'ends_on' => '2026-11-30',
            'status' => 'open', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $journal = DB::table('journals')->insertGetId([
            'company_id' => $company->id, 'fiscal_year_id' => $year,
            'accounting_period_id' => $period,
            'number' => 'SYN-INV-12', 'posting_date' => '2026-11-10',
            'document_date' => '2026-11-10',
            'description' => 'Synthetic isolated journal',
            'status' => 'draft', 'created_by' => $author->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $accounts = [];
        foreach (['4100', '2601', '2200'] as $code) {
            $accounts[$code] = DB::table('accounts')->insertGetId([
                'company_id' => $company->id, 'code' => $code,
                'name' => 'Synthetic account '.$code,
                'type' => 'synthetic', 'postable' => true, 'active' => true,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        foreach ([
            ['4100', '550.00', '0.00'],
            ['2601', '121.00', '0.00'],
            ['2200', '0.00', '671.00'],
        ] as $idx => [$code, $debit, $credit]) {
            DB::table('journal_entries')->insert([
                'journal_id' => $journal, 'line_no' => $idx + 1,
                'account_id' => $accounts[$code],
                'debit' => $debit, 'credit' => $credit,
                'description' => 'PRIVATE-FIXTURE-MUST-NOT-LEAK',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        return [$journal, $period, $accounts];
    }

    private function uri(int $company, int $journal): string
    {
        return "/api/companies/{$company}/demo/journal-previews/{$journal}";
    }

    public function test_explicit_local_gate_and_authenticated_read_only_response(): void
    {
        $company = $this->company('Synthetic A');
        $writer = $this->member($company, 'writer');
        [$journal] = $this->fixture($company, $writer);
        $this->getJson($this->uri($company->id, $journal))->assertUnauthorized();
        $this->actingAs($writer);
        $this->getJson($this->uri($company->id, $journal))->assertNotFound();
        config()->set('finai.synthetic_journal_preview_enabled', true);
        $response = $this->getJson($this->uri($company->id, $journal))
            ->assertOk()
            ->assertJsonPath('data.companyId', $company->id)
            ->assertJsonPath('data.reference', 'SYN-INV-12')
            ->assertJsonPath('data.currency', 'EUR')
            ->assertJsonPath('data.mode', 'synthetic-preview-only')
            ->assertJsonPath('data.postingAllowed', false)
            ->assertJsonPath('data.totalDebitCents', 67100)
            ->assertJsonPath('data.totalCreditCents', 67100)
            ->assertJsonCount(3, 'data.lines');
        $this->assertStringContainsString('no-store',
            $response->headers->get('Cache-Control', ''));
        $this->assertSame([
            'accountId' => 'SYN-ACC-4100',
            'debitCents' => 55000, 'creditCents' => 0,
        ], $response->json('data.lines.0'));
        $this->assertStringNotContainsString('PRIVATE-FIXTURE-MUST-NOT-LEAK',
            $response->getContent());
        $this->assertDatabaseHas('journals', ['id' => $journal, 'status' => 'draft']);
        $this->assertDatabaseCount('journal_entries', 3);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_tenant_permission_account_period_and_balance_fail_closed(): void
    {
        config()->set('finai.synthetic_journal_preview_enabled', true);
        $a = $this->company('A');
        $b = $this->company('B');
        $alice = $this->member($a, 'alice');
        $bob = $this->member($b, 'bob');
        $viewer = $this->member($a, 'viewer', false);
        [$journal, $period, $accounts] = $this->fixture($a, $alice);
        $url = $this->uri($a->id, $journal);
        $this->actingAs($bob)->getJson($url)->assertForbidden();
        $this->actingAs($viewer)->getJson($url)->assertUnprocessable();
        $this->actingAs($alice)->getJson($url)->assertOk();
        DB::table('accounts')->where('id', $accounts['2200'])
            ->update(['company_id' => $b->id]);
        $this->getJson($url)->assertUnprocessable();
        DB::table('accounts')->where('id', $accounts['2200'])
            ->update(['company_id' => $a->id]);

        DB::table('journal_entries')->where('journal_id', $journal)
            ->where('line_no', 3)->update(['credit' => '670.99']);
        $this->getJson($url)->assertUnprocessable();
        DB::table('journal_entries')->where('journal_id', $journal)
            ->where('line_no', 3)->update(['credit' => '671.00']);

        DB::table('accounting_periods')->where('id', $period)
            ->update(['status' => 'locked']);
        $this->getJson($url)->assertUnprocessable();
        DB::table('accounting_periods')->where('id', $period)
            ->update(['status' => 'open']);
        DB::table('journals')->where('id', $journal)->update(['status' => 'posted']);
        $this->getJson($url)->assertUnprocessable();
        DB::table('journals')->where('id', $journal)
            ->update(['status' => 'draft', 'number' => 'REAL-INV-12']);
        $this->getJson($url)->assertUnprocessable();
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_service_cannot_bypass_test_flag_or_production_guard(): void
    {
        $company = $this->company('Only demo');
        $actor = $this->member($company, 'writer');
        [$journal] = $this->fixture($company, $actor);
        $service = app(PreviewSyntheticDraftJournal::class);
        try {
            $service->execute($company->id, $journal, $actor->id);
            $this->fail('Flag-off preview must be refused.');
        } catch (\DomainException) { /* expected */ }
        config()->set('finai.synthetic_journal_preview_enabled', true);
        $this->assertFalse($service->execute($company->id, $journal, $actor->id)['postingAllowed']);
        $previous = app()->environment();
        app()->instance('env', 'production');
        try {
            $this->actingAs($actor)->getJson($this->uri($company->id, $journal))
                ->assertNotFound();
            try {
                $service->execute($company->id, $journal, $actor->id);
                $this->fail('A service call in production must fail closed.');
            } catch (\DomainException) { /* expected */ }
        } finally {
            app()->instance('env', $previous);
        }
        $this->assertDatabaseHas('journals', ['id' => $journal, 'status' => 'draft']);
        $this->assertDatabaseCount('audit_logs', 0);
    }
}
