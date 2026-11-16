<?php

namespace Tests\Feature;

use App\Application\Integrations\StageVerifiedSyntheticCommerceWebhook;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class Next14SyntheticSignedCommerceTest extends TestCase
{
    private const SECRET = 'SYNTHETIC-ONLY-SHOP-HMAC-QA-NOT-REAL-2026';

    protected function setUp(): void
    {
        parent::setUp();
        // Only isolated SQLite in-memory data, no hosting or provider requests.
        Schema::create('warehouses', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
            $t->boolean('active')->default(true);
        });
        $this->artisan('migrate', [
            '--path'=>'database/migrations/2026_11_14_000023_create_business_units_and_commerce_inbox.php',
            '--force'=>true,
        ])->run();
        config()->set('finai.synthetic_commerce_staging_enabled', true);
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name'=>$name, 'active'=>true]);
    }

    private function actor(Company $company, string $name, bool $canWrite = true): User
    {
        $user = User::query()->create([
            'name'=>$name, 'email'=>strtolower($name).'@example.test',
            'password'=>'synthetic-only-password', 'active'=>true,
        ]);
        $user->forceFill(['email_verified_at'=>now()])->save();
        $roleId = DB::table('roles')->insertGetId([
            'key'=>'next14-'.$user->id,'name'=>'NEXT14 Test Role','system'=>true,
        ]);
        if ($canWrite) {
            $permissionId=DB::table('permissions')->where('key','orders.write')->value('id');
            if (! $permissionId) {
                $permissionId=DB::table('permissions')->insertGetId([
                    'key'=>'orders.write','name'=>'Orders write',
                ]);
            }
            DB::table('permission_role')->insert([
                'role_id'=>$roleId,'permission_id'=>$permissionId,
            ]);
        }
        $user->companies()->attach($company->id,[
            'role_id'=>$roleId,'status'=>'active','joined_at'=>now(),
        ]);
        return $user;
    }

    private function fixtures(Company $company,string $provider): int
    {
        $warehouse=DB::table('warehouses')->insertGetId([
            'company_id'=>$company->id,'active'=>true,
        ]);
        $code = $provider==='shopify' ? 'SYN-SHOP-01' : 'SYN-WOO-01';
        $connection=DB::table('commerce_connections')->insertGetId([
            'company_id'=>$company->id,'provider'=>$provider,'code'=>$code,
            'status'=>'draft','created_at'=>now(),'updated_at'=>now(),
        ]);
        DB::table('commerce_sku_mappings')->insert([
            'company_id'=>$company->id,'connection_id'=>$connection,
            'external_sku'=>'TAB-10070','internal_sku'=>'TAB-10070',
            'created_at'=>now(),'updated_at'=>now(),
        ]);
        return $warehouse;
    }

    private function payload(Company $company,string $provider,int $warehouse): array
    {
        return [
            'demoOnly'=>true, 'companyId'=>$company->id,
            'provider'=>$provider,
            'connectionCode'=>$provider==='shopify'?'SYN-SHOP-01':'SYN-WOO-01',
            'warehouseId'=>$warehouse,
            'eventId'=>'SYN-WEBHOOK-EVENT-001',
            'externalOrderId'=>'SYN-WEBHOOK-ORDER-001',
            'currency'=>'EUR',
            'lines'=>[['sku'=>'TAB-10070','quantity'=>2,'unitPriceCents'=>12500]],
            'totalCents'=>25000,
            'issuedAt'=>gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }

    private function signed(array $payload, string $secret = self::SECRET): array
    {
        $raw=json_encode($payload, JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES);
        return [$raw, base64_encode(hash_hmac('sha256',$raw,$secret,true))];
    }

    private function rejects(callable $operation): void
    {
        try {
            $operation();
            $this->fail('Unsafe synthetic commerce event must fail closed.');
        } catch (\DomainException $error) {
            $this->assertNotSame('', $error->getMessage());
        }
    }

    public function test_both_provider_hmac_signatures_stage_only_review_and_dedupe(): void
    {
        $company=$this->company('Company A');
        $actor=$this->actor($company,'writer');
        $service=app(StageVerifiedSyntheticCommerceWebhook::class);
        foreach (['woocommerce','shopify'] as $provider) {
            $warehouse=$this->fixtures($company,$provider);
            [$raw,$signature]=$this->signed($this->payload($company,$provider,$warehouse));
            $first=$service->execute($company->id,$actor->id,$provider,
                $raw,$signature,self::SECRET);
            $this->assertFalse($first['replayed']);
            $this->assertSame('review',$first['status']);
            $this->assertSame($first['id'],$service->execute(
                $company->id,$actor->id,$provider,$raw,$signature,self::SECRET)['id']);
        }
        $this->assertDatabaseCount('commerce_order_events',2);
        $this->assertDatabaseCount('audit_logs',2);
        foreach (DB::table('commerce_order_events')->get() as $row) {
            $payload=json_decode($row->normalized_json,true,512,JSON_THROW_ON_ERROR);
            $this->assertTrue($payload['demo_only']);
            $this->assertFalse($payload['posting']);
            $this->assertSame(25000,$payload['total_cents']);
            $this->assertArrayNotHasKey('issuedAt',$payload);
            $this->assertArrayNotHasKey('customer',$payload);
        }
    }

    public function test_modified_payload_wrong_secret_and_invalid_signature_are_rejected(): void
    {
        $company=$this->company('Company A');
        $actor=$this->actor($company,'writer');
        $warehouse=$this->fixtures($company,'shopify');
        $payload=$this->payload($company,'shopify',$warehouse);
        [$raw,$signature]=$this->signed($payload);
        $service=app(StageVerifiedSyntheticCommerceWebhook::class);
        $this->rejects(fn()=>$service->execute($company->id,$actor->id,'shopify',
            $raw,$signature,'SYNTHETIC-DIFFERENT-SECRET-NOT-REAL'));
        $this->rejects(fn()=>$service->execute($company->id,$actor->id,'shopify',
            $raw.' ',$signature,self::SECRET));
        $this->rejects(fn()=>$service->execute($company->id,$actor->id,'shopify',
            $raw,str_repeat('X',44),self::SECRET));
        $this->rejects(fn()=>$service->execute($company->id,$actor->id,'woocommerce',
            $raw,$signature,self::SECRET));
        $this->assertDatabaseCount('commerce_order_events',0);
        $this->assertDatabaseCount('audit_logs',0);
    }

    public function test_signed_expiry_pii_and_wrong_company_are_rejected(): void
    {
        $a=$this->company('Company A');
        $b=$this->company('Company B');
        $alice=$this->actor($a,'alice');
        $bob=$this->actor($b,'bob');
        $viewer=$this->actor($a,'viewer',false);
        $warehouse=$this->fixtures($a,'woocommerce');
        $service=app(StageVerifiedSyntheticCommerceWebhook::class);
        foreach([
            ['issuedAt'=>gmdate('Y-m-d\TH:i:s\Z',time()-600)],
            ['issuedAt'=>gmdate('Y-m-d\TH:i:s\Z',time()+600)],
            ['customer'=>['email'=>'someone@example.test']],
            ['billing'=>['address'=>'something']],
            ['companyId'=>$b->id],
            ['totalCents'=>24999],
        ] as $bad) {
            [$raw,$signature]=$this->signed([...$this->payload($a,'woocommerce',$warehouse),...$bad]);
            $this->rejects(fn()=>$service->execute($a->id,$alice->id,
                'woocommerce',$raw,$signature,self::SECRET));
        }
        [$raw,$signature]=$this->signed($this->payload($a,'woocommerce',$warehouse));
        $this->rejects(fn()=>$service->execute($a->id,$viewer->id,
            'woocommerce',$raw,$signature,self::SECRET));
        $this->rejects(fn()=>$service->execute($a->id,$bob->id,
            'woocommerce',$raw,$signature,self::SECRET));
        $this->assertDatabaseCount('commerce_order_events',0);
    }

    public function test_flag_off_and_failed_audit_leave_no_staged_order(): void
    {
        $company=$this->company('Company A');
        $actor=$this->actor($company,'writer');
        $warehouse=$this->fixtures($company,'woocommerce');
        [$raw,$signature]=$this->signed($this->payload($company,'woocommerce',$warehouse));
        $service=app(StageVerifiedSyntheticCommerceWebhook::class);
        config()->set('finai.synthetic_commerce_staging_enabled',false);
        $this->rejects(fn()=>$service->execute($company->id,$actor->id,
            'woocommerce',$raw,$signature,self::SECRET));
        config()->set('finai.synthetic_commerce_staging_enabled',true);
        Schema::drop('audit_logs'); // Ephemeral SQLite test database only.
        try {
            $service->execute($company->id,$actor->id,
                'woocommerce',$raw,$signature,self::SECRET);
            $this->fail('Missing audit log must roll back synthetic webhook stage.');
        } catch (\Illuminate\Database\QueryException) {
            $this->assertDatabaseCount('commerce_order_events',0);
        }
    }
}
