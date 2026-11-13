<?php

namespace Tests\Feature;

use App\Application\Accounting\PostJournal;
use App\Application\Accounting\ReverseJournal;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class RealJournalPostingSyntheticTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Real core tables, but ONLY inside the isolated SQLite in-memory test DB.
        $this->artisan('migrate', [
            '--path' => 'database/migrations/2026_11_01_000002_create_accounting_core_tables.php',
            '--force' => true,
        ])->run();
    }

    private function company(string $label): Company
    {
        return Company::query()->create(['name' => $label, 'active' => true]);
    }

    private function member(Company $company, string $name, bool $writer = true): User
    {
        $user = User::query()->create([
            'name' => $name, 'email' => strtolower($name).'@example.test',
            'password' => 'isolated-synthetic-password', 'active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $roleId = DB::table('roles')->insertGetId([
            'key' => 'qa-'.$user->id, 'name' => 'QA ledger role', 'system' => true,
        ]);
        if ($writer) {
            $permission = DB::table('permissions')->where('key', 'ledger.post')->value('id');
            if (! $permission) {
                $permission = DB::table('permissions')->insertGetId([
                    'key' => 'ledger.post', 'name' => 'Post journal',
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id' => $roleId, 'permission_id' => $permission,
            ]);
        }
        $user->companies()->attach($company->id, [
            'role_id' => $roleId, 'status' => 'active', 'joined_at' => now(),
        ]);
        return $user;
    }

    private function period(Company $company): array
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
        return [$year, $period];
    }

    private function account(Company $company, string $code): int
    {
        return DB::table('accounts')->insertGetId([
            'company_id' => $company->id,
            'code' => $code, 'name' => 'Synthetic account '.$code,
            'type' => 'synthetic', 'postable' => true, 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function journal(Company $company, User $user, int $year, int $period,
        int $debitAccount, int $creditAccount,
        string $debit = '122.00', string $credit = '122.00',
        string $number = 'SYN-2026-001'): int
    {
        $id = DB::table('journals')->insertGetId([
            'company_id' => $company->id, 'fiscal_year_id' => $year,
            'accounting_period_id' => $period, 'number' => $number,
            'posting_date' => '2026-11-10', 'document_date' => '2026-11-10',
            'description' => 'Synthetic isolated journal',
            'status' => 'draft', 'created_by' => $user->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ([
            [1, $debitAccount, $debit, '0.00'],
            [2, $creditAccount, '0.00', $credit],
        ] as [$line, $account, $d, $c]) {
            DB::table('journal_entries')->insert([
                'journal_id' => $id, 'line_no' => $line, 'account_id' => $account,
                'debit' => $d, 'credit' => $c,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        return $id;
    }

    private function reject(callable $callback): void
    {
        try {
            $callback();
            $this->fail('Invalid synthetic journal should have been rejected.');
        } catch (\DomainException $e) {
            $this->assertNotSame('', $e->getMessage());
        }
    }

    public function test_real_journal_posts_and_reverses_balanced_synthetic_lines_atomically(): void
    {
        $company = $this->company('Company A');
        $user = $this->member($company, 'Alice');
        [$year, $period] = $this->period($company);
        $debit = $this->account($company, '1200');
        $credit = $this->account($company, '7600');
        $id = $this->journal($company, $user, $year, $period, $debit, $credit);

        app(PostJournal::class)->execute($id, $user->id);
        $this->assertDatabaseHas('journals', [
            'id' => $id, 'company_id' => $company->id,
            'status' => 'posted', 'posted_by' => $user->id,
        ]);
        $this->assertDatabaseCount('audit_logs', 1);
        $reversalId = app(ReverseJournal::class)->execute(
            $id, $user->id, 'SYN-STORNO-2026-001', '2026-11-11'
        );
        $this->assertDatabaseHas('journals', [
            'id' => $id, 'status' => 'reversed',
        ]);
        $this->assertDatabaseHas('journals', [
            'id' => $reversalId, 'company_id' => $company->id,
            'reversal_of_id' => $id, 'status' => 'posted',
        ]);
        $this->assertDatabaseHas('journal_entries', [
            'journal_id' => $reversalId, 'account_id' => $debit,
            'debit' => 0, 'credit' => 122,
        ]);
        $this->assertDatabaseHas('journal_entries', [
            'journal_id' => $reversalId, 'account_id' => $credit,
            'debit' => 122, 'credit' => 0,
        ]);
        $this->assertDatabaseCount('audit_logs', 2);
        $this->assertDatabaseCount('journals', 2);
        $this->assertDatabaseCount('journal_entries', 4);
        $this->reject(fn () => app(ReverseJournal::class)->execute(
            $id, $user->id, 'SYN-STORNO-2026-002', '2026-11-11'
        ));
        $this->reject(fn () => app(PostJournal::class)->execute($id, $user->id));
        $this->assertDatabaseCount('audit_logs', 2);
    }

    public function test_unbalanced_journal_and_locked_period_never_change_status(): void
    {
        $company = $this->company('Company A');
        $user = $this->member($company, 'Alice');
        [$year, $period] = $this->period($company);
        $debit = $this->account($company, '1200');
        $credit = $this->account($company, '7600');
        $id = $this->journal($company, $user, $year, $period, $debit, $credit,
            '122.00', '121.99');
        $this->reject(fn () => app(PostJournal::class)->execute($id, $user->id));
        $this->assertDatabaseHas('journals', ['id' => $id, 'status' => 'draft']);
        DB::table('journal_entries')->where('journal_id', $id)
            ->where('line_no', 2)->update(['credit' => '122.00']);
        DB::table('accounting_periods')->where('id', $period)
            ->update(['status' => 'locked']);
        $this->reject(fn () => app(PostJournal::class)->execute($id, $user->id));
        $this->assertDatabaseHas('journals', ['id' => $id, 'status' => 'draft']);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_different_company_accounts_periods_and_tax_metadata_are_rejected(): void
    {
        $a = $this->company('Company A');
        $b = $this->company('Company B');
        $user = $this->member($a, 'Alice');
        [$yearA, $periodA] = $this->period($a);
        [, $periodB] = $this->period($b);
        $accountA = $this->account($a, '1200');
        $accountB = $this->account($b, '7600');
        $idForeign = $this->journal($a, $user, $yearA, $periodA,
            $accountA, $accountB, number: 'SYN-FOREIGN-ACCOUNT');
        $this->reject(fn () => app(PostJournal::class)->execute($idForeign, $user->id));
        $localCredit = $this->account($a, '7600');
        $idPeriod = $this->journal($a, $user, $yearA, $periodB,
            $accountA, $localCredit, number: 'SYN-FOREIGN-PERIOD');
        $this->reject(fn () => app(PostJournal::class)->execute($idPeriod, $user->id));

        $idMeta = $this->journal($a, $user, $yearA, $periodA,
            $accountA, $localCredit, number: 'SYN-FOREIGN-TAX');
        $foreignTax = DB::table('tax_codes')->insertGetId([
            'company_id' => $b->id, 'code' => 'SYN-VAT-22',
            'name' => 'Synthetic tax code', 'rate' => 22,
            'direction' => 'sales', 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('journal_entries')->where('journal_id', $idMeta)
            ->where('line_no', 2)->update(['tax_code_id' => $foreignTax]);
        $this->reject(fn () => app(PostJournal::class)->execute($idMeta, $user->id));
        $this->assertDatabaseCount('audit_logs', 0);
        $this->assertSame(3, DB::table('journals')->where('status', 'draft')->count());
    }

    public function test_inactive_or_unauthorized_user_cannot_post(): void
    {
        $company = $this->company('Company A');
        $reader = $this->member($company, 'Viewer', false);
        $writer = $this->member($company, 'Alice', true);
        [$year, $period] = $this->period($company);
        $debit = $this->account($company, '1200');
        $credit = $this->account($company, '7600');
        $id = $this->journal($company, $writer, $year, $period, $debit, $credit);
        $this->reject(fn () => app(PostJournal::class)->execute($id, $reader->id));
        DB::table('company_user')->where('company_id', $company->id)
            ->where('user_id', $writer->id)->update(['status' => 'suspended']);
        $this->reject(fn () => app(PostJournal::class)->execute($id, $writer->id));
        $this->assertDatabaseHas('journals', ['id' => $id, 'status' => 'draft']);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_failure_to_write_audit_rolls_back_real_journal_posting(): void
    {
        $company = $this->company('Company A');
        $user = $this->member($company, 'Alice');
        [$year, $period] = $this->period($company);
        $id = $this->journal($company, $user, $year, $period,
            $this->account($company, '1200'), $this->account($company, '7600'));
        Schema::drop('audit_logs'); // Local ephemeral test schema ONLY.
        try {
            app(PostJournal::class)->execute($id, $user->id);
            $this->fail('Missing audit table should abort a posting transaction.');
        } catch (\Illuminate\Database\QueryException $error) {
            $this->assertDatabaseHas('journals', ['id' => $id, 'status' => 'draft']);
            $this->assertSame(0, DB::table('journals')->where('status', 'posted')->count());
        }
    }

    public function test_failure_to_write_audit_rolls_back_real_reversal(): void
    {
        $company = $this->company('Company A');
        $user = $this->member($company, 'Alice');
        [$year, $period] = $this->period($company);
        $id = $this->journal($company, $user, $year, $period,
            $this->account($company, '1200'), $this->account($company, '7600'));
        app(PostJournal::class)->execute($id, $user->id);
        Schema::drop('audit_logs'); // Local ephemeral test schema ONLY.
        try {
            app(ReverseJournal::class)->execute($id, $user->id, 'SYN-REV-001', '2026-11-11');
            $this->fail('Missing audit table should abort a reversal transaction.');
        } catch (\Illuminate\Database\QueryException $error) {
            $this->assertDatabaseHas('journals', ['id' => $id, 'status' => 'posted']);
            $this->assertDatabaseCount('journals', 1);
            $this->assertDatabaseCount('journal_entries', 2);
        }
    }
}
