<?php

namespace Tests\Feature;

use App\Application\IncomingInvoices\ApproveIncomingInvoice;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class IncomingInvoiceTenantApprovalTest extends TestCase
{
    private int $companyA;
    private int $companyB;
    private int $permissionId;

    protected function setUp(): void
    {
        parent::setUp();

        // Synthetic SQLite-only slice; do not run the incomplete ERP migrations.
        Schema::create('documents', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('company_id');
        });
        Schema::create('partners', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('company_id');
        });
        Schema::create('incoming_invoices', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('document_id');
            $table->unsignedBigInteger('partner_id')->nullable();
            $table->string('invoice_number');
            $table->date('issue_date');
            $table->decimal('net_amount', 18, 2);
            $table->decimal('tax_amount', 18, 2);
            $table->decimal('gross_amount', 18, 2);
            $table->string('status');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
        Schema::create('incoming_invoice_lines', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('incoming_invoice_id');
            $table->unsignedInteger('line_no');
            $table->decimal('net_amount', 18, 2);
            $table->decimal('tax_amount', 18, 2);
            $table->decimal('gross_amount', 18, 2);
            $table->unsignedBigInteger('suggested_account_id')->nullable();
            $table->unsignedBigInteger('cost_center_id')->nullable();
            $table->unsignedBigInteger('tax_code_id')->nullable();
        });
        foreach (['accounts','cost_centers','tax_codes'] as $name) {
            Schema::create($name, function (Blueprint $table): void {
                $table->id();
                $table->unsignedBigInteger('company_id');
            });
        }

        $this->companyA = DB::table('companies')->insertGetId(['name'=>'Test company A','active'=>true]);
        $this->companyB = DB::table('companies')->insertGetId(['name'=>'Test company B','active'=>true]);
        $this->permissionId = DB::table('permissions')->insertGetId([
            'key'=>'invoices.approve','name'=>'Approve incoming invoices'
        ]);
    }

    private function actor(int $companyId, string $role='accountant', bool $twoFactor=false, string $status='active'): int
    {
        $id = DB::table('users')->insertGetId([
            'name'=>'Synthetic member',
            'email'=>'synthetic-'.$companyId.'-'.uniqid().'@example.test',
            'password'=>'not-a-real-password',
            'active'=>true,
            'email_verified_at'=>now(),
            'two_factor_confirmed_at'=>$twoFactor?now():null,
        ]);
        $roleId = DB::table('roles')->insertGetId(['key'=>$role.'-'.$id,'name'=>$role]);
        // The production role has the canonical key; assign its key for 2FA checks.
        DB::table('roles')->where('id',$roleId)->update(['key'=>$role]);
        if ($role!=='viewer') {
            DB::table('permission_role')->insert(['role_id'=>$roleId,'permission_id'=>$this->permissionId]);
        }
        DB::table('company_user')->insert([
            'company_id'=>$companyId,'user_id'=>$id,'role_id'=>$roleId,'status'=>$status
        ]);
        return $id;
    }

    private function incoming(int $companyId, ?int $docCompany=null, ?int $partnerCompany=null, bool $validTotals=true): int
    {
        $documentId = DB::table('documents')->insertGetId(['company_id'=>$docCompany??$companyId]);
        $partnerId = DB::table('partners')->insertGetId(['company_id'=>$partnerCompany??$companyId]);
        $invoiceId = DB::table('incoming_invoices')->insertGetId([
            'company_id'=>$companyId,
            'document_id'=>$documentId,
            'partner_id'=>$partnerId,
            'invoice_number'=>'SYNTHETIC-'.$companyId.'-'.uniqid(),
            'issue_date'=>'2026-11-10',
            'net_amount'=>'100.00',
            'tax_amount'=>$validTotals?'22.00':'21.00',
            'gross_amount'=>'122.00',
            'status'=>'review',
        ]);
        DB::table('incoming_invoice_lines')->insert([
            'incoming_invoice_id'=>$invoiceId,
            'line_no'=>1,
            'net_amount'=>'100.00',
            'tax_amount'=>'22.00',
            'gross_amount'=>'122.00',
        ]);
        return $invoiceId;
    }

    private function deny(int $companyId, int $invoiceId, int $actorId): void
    {
        try {
            app(ApproveIncomingInvoice::class)->execute($companyId,$invoiceId,$actorId);
            $this->fail('Approval should be denied');
        } catch (\DomainException $exception) {
            $this->assertNotSame('', $exception->getMessage());
        }
    }

    public function test_member_with_permission_approves_once_and_writes_scoped_audit(): void
    {
        $actor = $this->actor($this->companyA);
        $invoice = $this->incoming($this->companyA);

        app(ApproveIncomingInvoice::class)->execute($this->companyA,$invoice,$actor);
        $this->assertDatabaseHas('incoming_invoices',[
            'id'=>$invoice,'company_id'=>$this->companyA,'status'=>'approved','approved_by'=>$actor
        ]);
        $this->assertDatabaseHas('audit_logs',[
            'company_id'=>$this->companyA,'actor_user_id'=>$actor,
            'event_type'=>'incoming_invoice.approved','entity_id'=>(string)$invoice
        ]);
        $this->deny($this->companyA,$invoice,$actor);
        $this->assertDatabaseCount('audit_logs',1);
    }

    public function test_cross_company_invoice_and_unrelated_member_are_denied(): void
    {
        $actor = $this->actor($this->companyA);
        $foreign = $this->incoming($this->companyB);
        $own = $this->incoming($this->companyA);
        $this->deny($this->companyA,$foreign,$actor);
        $this->deny($this->companyB,$foreign,$actor);
        $this->assertDatabaseHas('incoming_invoices',['id'=>$foreign,'status'=>'review']);
        $this->assertDatabaseHas('incoming_invoices',['id'=>$own,'status'=>'review']);
        $this->assertDatabaseCount('audit_logs',0);
    }

    public function test_viewer_suspended_member_and_owner_without_two_factor_are_denied(): void
    {
        $invoice = $this->incoming($this->companyA);
        foreach ([
            $this->actor($this->companyA,'viewer'),
            $this->actor($this->companyA,'accountant',false,'suspended'),
            $this->actor($this->companyA,'owner',false),
        ] as $actor) {
            $this->deny($this->companyA,$invoice,$actor);
        }
        $this->assertDatabaseCount('audit_logs',0);
        $this->assertDatabaseHas('incoming_invoices',['id'=>$invoice,'status'=>'review']);
    }

    public function test_cross_company_document_and_partner_references_are_denied(): void
    {
        $actor = $this->actor($this->companyA);
        foreach ([
            $this->incoming($this->companyA,$this->companyB),
            $this->incoming($this->companyA,null,$this->companyB),
        ] as $invoice) {
            $this->deny($this->companyA,$invoice,$actor);
            $this->assertDatabaseHas('incoming_invoices',['id'=>$invoice,'status'=>'review']);
        }
        $this->assertDatabaseCount('audit_logs',0);
    }

    public function test_foreign_account_link_and_invalid_totals_cannot_be_approved(): void
    {
        $actor = $this->actor($this->companyA);
        $invoice = $this->incoming($this->companyA);
        $foreignAccount = DB::table('accounts')->insertGetId(['company_id'=>$this->companyB]);
        DB::table('incoming_invoice_lines')
            ->where('incoming_invoice_id',$invoice)->update(['suggested_account_id'=>$foreignAccount]);
        $this->deny($this->companyA,$invoice,$actor);

        DB::table('incoming_invoice_lines')
            ->where('incoming_invoice_id',$invoice)->update(['suggested_account_id'=>null]);
        DB::table('incoming_invoices')->where('id',$invoice)->update(['tax_amount'=>'21.00']);
        $this->deny($this->companyA,$invoice,$actor);
        $this->assertDatabaseCount('audit_logs',0);
    }
}
