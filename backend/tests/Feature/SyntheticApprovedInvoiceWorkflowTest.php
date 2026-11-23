<?php

namespace Tests\Feature;

use App\Application\Accounting\PreviewSyntheticDraftJournal;
use App\Application\IncomingInvoices\ApproveIncomingInvoice;
use App\Application\IncomingInvoices\SyntheticApprovedInvoiceJournalWorkflow;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class SyntheticApprovedInvoiceWorkflowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Real finance tables ONLY in the isolated :memory: SQLite test DB.
        Schema::create('partners', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('company_id');
        });
        foreach ([
            '2026_11_01_000002_create_accounting_core_tables.php',
            '2026_11_02_000004_create_incoming_invoice_tables.php',
        ] as $migration) {
            $this->artisan('migrate', [
                '--path' => 'database/migrations/'.$migration,
                '--force' => true,
            ])->run();
        }
        config()->set('finai.synthetic_journal_preview_enabled', true);
        config()->set('finai.synthetic_approved_invoice_workflow_enabled', true);
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name' => $name, 'active' => true]);
    }

    private function actor(Company $company, string $name, bool $canApprove = true,
        bool $canPost = true): User
    {
        $user = User::query()->create([
            'name' => $name, 'email' => $name.'@example.test',
            'password' => 'synthetic-test-only-password', 'active' => true,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $roleId = DB::table('roles')->insertGetId([
            'key' => 'synthetic-workflow-'.$user->id,
            'name' => 'Synthetic workflow accountant', 'system' => true,
        ]);
        foreach ([
            'invoices.approve' => $canApprove,
            'ledger.post' => $canPost,
        ] as $permission => $enabled) {
            if (! $enabled) continue;
            $permissionId = DB::table('permissions')
                ->where('key', $permission)->value('id');
            if (! $permissionId) {
                $permissionId = DB::table('permissions')->insertGetId([
                    'key' => $permission, 'name' => $permission,
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id' => $roleId, 'permission_id' => $permissionId,
            ]);
        }
        $user->companies()->attach($company->id, [
            'role_id' => $roleId, 'status' => 'active', 'joined_at' => now(),
        ]);
        return $user;
    }

    private function fixture(Company $company, User $actor): array
    {
        $partner = DB::table('partners')->insertGetId(['company_id' => $company->id]);
        $documentId = DB::table('documents')->insertGetId([
            'company_id' => $company->id, 'uploaded_by' => $actor->id,
            'kind' => 'incoming_invoice', 'original_name' => 'synthetic-only.pdf',
            'mime_type' => 'application/pdf', 'size_bytes' => 64,
            'sha256' => hash('sha256', (string) $company->id.'-'.uniqid('', true)),
            'storage_disk' => 'local', 'storage_path' => 'synthetic-only/no-real-file',
            'status' => 'uploaded', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $reference = 'SYN-INV-'.$documentId;
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
        $accounts = [];
        foreach (['4100','2601','2200'] as $code) {
            $accounts[$code] = DB::table('accounts')->insertGetId([
                'company_id' => $company->id, 'code' => $code,
                'name' => 'Synthetic account '.$code,
                'type' => 'synthetic', 'postable' => true, 'active' => true,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $journalId = DB::table('journals')->insertGetId([
            'company_id' => $company->id, 'fiscal_year_id' => $year,
            'accounting_period_id' => $period, 'number' => $reference,
            'posting_date' => '2026-11-10', 'document_date' => '2026-11-10',
            'document_ref' => $reference,
            'description' => 'Synthetic isolated journal', 'status' => 'draft',
            'created_by' => $actor->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $detail = [
            ['4100', 55000, 0], ['2601', 12100, 0], ['2200', 0, 67100],
        ];
        foreach ($detail as $i => [$code, $debit, $credit]) {
            DB::table('journal_entries')->insert([
                'journal_id' => $journalId, 'line_no' => $i + 1,
                'account_id' => $accounts[$code],
                'debit' => number_format($debit / 100, 2, '.', ''),
                'credit' => number_format($credit / 100, 2, '.', ''),
                'description' => 'PRIVATE-SYNTHETIC-FIXTURE',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $invoiceId = DB::table('incoming_invoices')->insertGetId([
            'company_id' => $company->id, 'document_id' => $documentId,
            'partner_id' => $partner, 'journal_id' => $journalId,
            'invoice_number' => $reference, 'issue_date' => '2026-11-10',
            'currency' => 'EUR', 'net_amount' => '550.00',
            'tax_amount' => '121.00', 'gross_amount' => '671.00',
            'status' => 'review', 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('incoming_invoice_lines')->insert([
            'incoming_invoice_id' => $invoiceId, 'line_no' => 1,
            'description' => 'Synthetic service', 'quantity' => '1.0000',
            'net_amount' => '550.00', 'tax_amount' => '121.00',
            'gross_amount' => '671.00',
            'suggested_account_id' => $accounts['4100'],
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $proposal = [
            'demoOnly' => true, 'postingAllowed' => false, 'currency' => 'EUR',
            'reference' => $reference, 'lines' => array_map(
                static fn (array $line) => [
                    'accountId' => 'SYN-ACC-'.$line[0],
                    'debitCents' => $line[1], 'creditCents' => $line[2],
                ], $detail),
        ];
        $proposalId = DB::table('accounting_proposals')->insertGetId([
            'incoming_invoice_id' => $invoiceId, 'provider' => 'synthetic-qa',
            'proposal_json' => json_encode($proposal, JSON_THROW_ON_ERROR),
            'status' => 'proposed', 'created_at' => now(), 'updated_at' => now(),
        ]);
        return [$invoiceId, $proposalId, $journalId, $period, $accounts];
    }

    private function service(): SyntheticApprovedInvoiceJournalWorkflow
    {
        return app(SyntheticApprovedInvoiceJournalWorkflow::class);
    }

    private function drafts(): PreviewSyntheticDraftJournal
    {
        return app(PreviewSyntheticDraftJournal::class);
    }

    private function denied(callable $action): void
    {
        try {
            $action();
            $this->fail('Unsafe synthetic invoice workflow should be denied.');
        } catch (\DomainException $error) {
            $this->assertNotSame('', $error->getMessage());
        }
    }

    public function test_human_approval_proposal_review_and_draft_preflight_never_post(): void
    {
        $company = $this->company('Synthetic A');
        $actor = $this->actor($company, 'alice');
        [$invoice, $proposal, $journal] = $this->fixture($company, $actor);
        $this->denied(fn () => $this->service()->acceptProposal(
            $company->id, $invoice, $proposal, $actor->id, $this->drafts()));
        $this->denied(fn () => $this->service()->preview(
            $company->id, $invoice, $actor->id, $this->drafts()));

        app(ApproveIncomingInvoice::class)->execute($company->id, $invoice, $actor->id);
        $this->denied(fn () => $this->service()->preview(
            $company->id, $invoice, $actor->id, $this->drafts()));
        $this->service()->acceptProposal(
            $company->id, $invoice, $proposal, $actor->id, $this->drafts());

        $review = $this->service()->preview(
            $company->id, $invoice, $actor->id, $this->drafts());
        $this->assertSame('synthetic-invoice-review-only', $review['mode']);
        $this->assertTrue($review['approved']);
        $this->assertTrue($review['proposalReviewed']);
        $this->assertFalse($review['postingAllowed']);
        $this->assertSame(67100, $review['totalDebitCents']);
        $this->assertSame(67100, $review['totalCreditCents']);
        $this->assertCount(3, $review['lines']);
        $this->assertDatabaseHas('journals', [
            'id' => $journal, 'status' => 'draft', 'posted_by' => null,
        ]);
        $this->assertDatabaseHas('accounting_proposals', [
            'id' => $proposal, 'status' => 'accepted', 'reviewed_by' => $actor->id,
        ]);
        $this->assertDatabaseCount('audit_logs', 2);
        $this->denied(fn () => $this->service()->acceptProposal(
            $company->id, $invoice, $proposal, $actor->id, $this->drafts()));
        $this->assertDatabaseCount('audit_logs', 2);
    }

    public function test_wrong_tenant_permissions_and_modified_proposal_fail_closed(): void
    {
        $a = $this->company('Synthetic A');
        $b = $this->company('Synthetic B');
        $alice = $this->actor($a, 'alice');
        $bob = $this->actor($b, 'bob');
        $viewer = $this->actor($a, 'viewer', false);
        [$invoice, $proposal] = $this->fixture($a, $alice);
        app(ApproveIncomingInvoice::class)->execute($a->id, $invoice, $alice->id);
        $this->denied(fn () => $this->service()->acceptProposal(
            $a->id, $invoice, $proposal, $bob->id, $this->drafts()));
        $this->denied(fn () => $this->service()->acceptProposal(
            $a->id, $invoice, $proposal, $viewer->id, $this->drafts()));
        DB::table('accounting_proposals')->where('id', $proposal)
            ->update(['proposal_json' => json_encode([
                'demoOnly' => true, 'reference' => 'SYN-INV-999',
                'currency' => 'EUR', 'postingAllowed' => false, 'lines' => [],
            ], JSON_THROW_ON_ERROR)]);
        $this->denied(fn () => $this->service()->acceptProposal(
            $a->id, $invoice, $proposal, $alice->id, $this->drafts()));
        $this->assertDatabaseHas('accounting_proposals', [
            'id' => $proposal, 'status' => 'proposed',
        ]);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_reviewed_flow_rejects_locked_period_and_changed_journal(): void
    {
        $company = $this->company('Synthetic A');
        $alice = $this->actor($company, 'alice');
        [$invoice, $proposal, $journal, $period] = $this->fixture($company, $alice);
        app(ApproveIncomingInvoice::class)->execute($company->id, $invoice, $alice->id);
        $this->service()->acceptProposal(
            $company->id, $invoice, $proposal, $alice->id, $this->drafts());

        DB::table('accounting_periods')->where('id', $period)
            ->update(['status' => 'locked']);
        $this->denied(fn () => $this->service()->preview(
            $company->id, $invoice, $alice->id, $this->drafts()));
        DB::table('accounting_periods')->where('id', $period)
            ->update(['status' => 'open']);
        DB::table('journals')->where('id', $journal)->update(['status' => 'posted']);
        $this->denied(fn () => $this->service()->preview(
            $company->id, $invoice, $alice->id, $this->drafts()));
        $this->assertDatabaseCount('audit_logs', 2);
    }

    public function test_flags_production_and_missing_audit_record_fail_closed(): void
    {
        $company = $this->company('Synthetic A');
        $alice = $this->actor($company, 'alice');
        [$invoice, $proposal] = $this->fixture($company, $alice);
        app(ApproveIncomingInvoice::class)->execute($company->id, $invoice, $alice->id);
        config()->set('finai.synthetic_approved_invoice_workflow_enabled', false);
        $this->denied(fn () => $this->service()->acceptProposal(
            $company->id, $invoice, $proposal, $alice->id, $this->drafts()));
        config()->set('finai.synthetic_approved_invoice_workflow_enabled', true);
        $previous = app()->environment();
        app()->instance('env', 'production');
        try {
            $this->denied(fn () => $this->service()->acceptProposal(
                $company->id, $invoice, $proposal, $alice->id, $this->drafts()));
        } finally {
            app()->instance('env', $previous);
        }

        Schema::drop('audit_logs'); // Disposable SQLite in-memory ONLY.
        try {
            $this->service()->acceptProposal(
                $company->id, $invoice, $proposal, $alice->id, $this->drafts());
            $this->fail('Missing audit table should roll back the synthetic review.');
        } catch (\Illuminate\Database\QueryException) {
            $this->assertDatabaseHas('accounting_proposals', [
                'id' => $proposal, 'status' => 'proposed',
            ]);
        }
    }
}
