<?php

namespace App\Application\Documents;

use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use RuntimeException;

final class SyntheticDocumentVault
{
    public const MAX_BYTES=65536;

    private function assertAllowed(int $userId, int $companyId): void
    {
        // Deliberately unavailable in any public/production deployment.
        abort_unless(app()->environment(['testing','local']) &&
            config('finai.synthetic_document_vault_enabled', false), 404);
        $user=User::findOrFail($userId);
        abort_unless(Gate::forUser($user)->allows('company.access',$companyId),403);
    }

    private function validate(string $name, string $mime, string $bytes): void
    {
        abort_unless(strlen($bytes)>0 && strlen($bytes)<=self::MAX_BYTES, 422,
            'Demo dokument mora biti manjši od 64 KiB.');
        abort_unless((bool)preg_match('/\Asynthetic-[a-zA-Z0-9_-]{1,96}\.(pdf|png|jpg)\z/D',$name),422,
            'Samo sintetično poimenovani dokumenti.');
        $extension=strtolower(pathinfo($name, PATHINFO_EXTENSION));
        $types=['pdf'=>'application/pdf','png'=>'image/png','jpg'=>'image/jpeg'];
        abort_unless($types[$extension]===$mime,422,'Vrsta in končnica se ne ujemata.');
        $valid=match($extension){
            'pdf'=>str_starts_with($bytes,'%PDF-'),
            'png'=>str_starts_with($bytes,"\x89PNG\r\n\x1a\n"),
            'jpg'=>str_starts_with($bytes,"\xff\xd8\xff"),
            default=>false,
        };
        abort_unless($valid,422,'Neveljaven podpis testne datoteke.');
    }

    public function store(int $userId,int $companyId,string $name,string $mime,string $bytes): array
    {
        $this->assertAllowed($userId,$companyId);
        $this->validate($name,$mime,$bytes);
        $digest=hash('sha256',$bytes);
        return DB::transaction(function()use($userId,$companyId,$name,$mime,$bytes,$digest):array{
            $id=DB::table('synthetic_documents')->insertGetId([
                'company_id'=>$companyId,'created_by'=>$userId,
                'original_name'=>$name,'mime'=>$mime,'size_bytes'=>strlen($bytes),
                'sha256'=>$digest,
                'encrypted_payload'=>Crypt::encryptString(base64_encode($bytes)),
                'created_at'=>now(),'updated_at'=>now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id'=>$companyId,'actor_user_id'=>$userId,
                'event_type'=>'synthetic_document.stored',
                'entity_type'=>'synthetic_document','entity_id'=>(string)$id,
                'metadata'=>json_encode(['sha256'=>$digest,'demo_only'=>true]),
                'created_at'=>now(),
            ]);
            return ['id'=>$id,'company_id'=>$companyId,'sha256'=>$digest,
                'size_bytes'=>strlen($bytes),'demo_only'=>true];
        });
    }

    public function listMetadata(int $userId,int $companyId): array
    {
        $this->assertAllowed($userId,$companyId);
        return DB::table('synthetic_documents')
            ->where('company_id',$companyId)->orderByDesc('id')->limit(100)
            ->get(['id','company_id','original_name','mime','size_bytes','sha256'])
            ->toArray();
    }

    public function read(int $userId,int $companyId,int $id): string
    {
        $this->assertAllowed($userId,$companyId);
        $row=DB::table('synthetic_documents')
            ->where('company_id',$companyId)->where('id',$id)->first();
        abort_unless($row,404);
        $decoded=base64_decode(Crypt::decryptString($row->encrypted_payload),true);
        if($decoded===false || !hash_equals($row->sha256,hash('sha256',$decoded))){
            throw new RuntimeException('Integrity check failed for synthetic document.');
        }
        return $decoded;
    }
}
