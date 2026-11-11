<?php

namespace Tests\Feature;

use App\Application\Documents\SyntheticDocumentVault;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

final class SyntheticDocumentVaultTest extends TestCase
{
    private function company(string $name): Company
    {
        return Company::query()->create(['name'=>$name,'active'=>true]);
    }
    private function member(string $name,Company $company): User
    {
        $user=User::query()->create([
            'name'=>$name,'email'=>strtolower($name).'@example.test',
            'password'=>'synthetic-password','active'=>true,
        ]);
        $user->forceFill(['email_verified_at'=>now()])->save();
        $role=DB::table('roles')->insertGetId([
            'key'=>'viewer-'.$user->id,'name'=>'Viewer','system'=>true,
        ]);
        $user->companies()->attach($company->id,[
            'role_id'=>$role,'status'=>'active','joined_at'=>now(),
        ]);
        return $user;
    }
    private function vault(): SyntheticDocumentVault
    {
        return app(SyntheticDocumentVault::class);
    }
    private function pdf(): string
    {
        return "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF";
    }

    public function test_disabled_by_default_and_only_runs_in_isolated_test_mode(): void
    {
        $company=$this->company('A');
        $user=$this->member('Alice',$company);
        $this->assertFalse(config('finai.synthetic_document_vault_enabled'));
        try {
            $this->vault()->store($user->id,$company->id,'synthetic-a.pdf',
                'application/pdf',$this->pdf());
            $this->fail('Disabled vault must reject all writes.');
        } catch(HttpException $e) {
            $this->assertSame(404,$e->getStatusCode());
        }
        $this->assertDatabaseCount('synthetic_documents',0);
    }

    public function test_only_encrypted_bytes_are_stored_with_hash_and_audit(): void
    {
        config()->set('finai.synthetic_document_vault_enabled',true);
        $company=$this->company('A');
        $user=$this->member('Alice',$company);
        $plain=$this->pdf();
        $saved=$this->vault()->store($user->id,$company->id,
            'synthetic-example.pdf','application/pdf',$plain);
        $this->assertTrue($saved['demo_only']);
        $this->assertSame(hash('sha256',$plain),$saved['sha256']);
        $row=DB::table('synthetic_documents')->where('id',$saved['id'])->first();
        $this->assertNotSame($plain,$row->encrypted_payload);
        $this->assertStringNotContainsString('%PDF-',$row->encrypted_payload);
        $this->assertSame(base64_encode($plain),Crypt::decryptString($row->encrypted_payload));
        $this->assertSame($plain,$this->vault()->read($user->id,$company->id,$saved['id']));
        $this->assertCount(1,$this->vault()->listMetadata($user->id,$company->id));
        $this->assertDatabaseHas('audit_logs',[
            'company_id'=>$company->id,'event_type'=>'synthetic_document.stored',
            'entity_type'=>'synthetic_document','entity_id'=>(string)$saved['id'],
        ]);
    }

    public function test_other_company_cannot_read_metadata_or_plaintext(): void
    {
        config()->set('finai.synthetic_document_vault_enabled',true);
        $a=$this->company('A');$b=$this->company('B');
        $alice=$this->member('Alice',$a);$bob=$this->member('Bob',$b);
        $saved=$this->vault()->store($alice->id,$a->id,
            'synthetic-only.pdf','application/pdf',$this->pdf());
        $this->assertSame([],$this->vault()->listMetadata($bob->id,$b->id));
        foreach([
            fn()=> $this->vault()->read($bob->id,$b->id,$saved['id']),
            fn()=> $this->vault()->read($bob->id,$a->id,$saved['id']),
        ] as $call) {
            try {$call();$this->fail('Cross-company read permitted.');}
            catch(HttpException $e){$this->assertContains($e->getStatusCode(),[403,404]);}
        }
        $this->assertDatabaseCount('audit_logs',1);
    }

    public function test_invalid_or_oversized_payload_never_produces_a_record(): void
    {
        config()->set('finai.synthetic_document_vault_enabled',true);
        $company=$this->company('A');
        $user=$this->member('Alice',$company);
        foreach([
            ['synthetic-a.pdf','text/html',$this->pdf()],
            ['synthetic-a.pdf','application/pdf','not a pdf'],
            ['../synthetic-a.pdf','application/pdf',$this->pdf()],
            ['synthetic-a.pdf','application/pdf',str_repeat('X',65537)],
            ['real-invoice.pdf','application/pdf',$this->pdf()],
        ] as [$name,$mime,$bytes]){
            try {
                $this->vault()->store($user->id,$company->id,$name,$mime,$bytes);
                $this->fail('Invalid document unexpectedly stored.');
            } catch(HttpException $e){$this->assertSame(422,$e->getStatusCode());}
        }
        $this->assertDatabaseCount('synthetic_documents',0);
        $this->assertDatabaseCount('audit_logs',0);
    }

    public function test_hash_tampering_is_detected_before_returning_plaintext(): void
    {
        config()->set('finai.synthetic_document_vault_enabled',true);
        $company=$this->company('A');
        $user=$this->member('Alice',$company);
        $saved=$this->vault()->store($user->id,$company->id,
            'synthetic-integrity.pdf','application/pdf',$this->pdf());
        DB::table('synthetic_documents')->where('id',$saved['id'])
            ->update(['sha256'=>str_repeat('0',64)]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Integrity check failed');
        $this->vault()->read($user->id,$company->id,$saved['id']);
    }
}
