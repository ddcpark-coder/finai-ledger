<?php

namespace Tests\Feature;

use App\Application\Integrations\StageSyntheticCommerceOrder;
use App\Application\Organization\BusinessUnitRegistry;
use App\Domain\Integrations\CommerceOrderContract;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class Next11BusinessUnitsCommerceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Fake real-catalog dependency and dedicated schema ONLY in SQLite :memory:.
        Schema::create('warehouses', function(Blueprint $t):void {
            $t->id();$t->unsignedBigInteger('company_id');
            $t->boolean('active')->default(true);
        });
        $this->artisan('migrate',[
            '--path'=>'database/migrations/2026_11_14_000023_create_business_units_and_commerce_inbox.php',
            '--force'=>true,
        ])->run();
    }

    private function company(string $name): Company
    {
        return Company::query()->create(['name'=>$name,'active'=>true]);
    }
    private function actor(Company $company,string $name,array $permissions):User
    {
        $user=User::query()->create([
            'name'=>$name,'email'=>strtolower(str_replace(' ','-',$name)).'@example.test',
            'password'=>'synthetic-test-password', 'active'=>true,
        ]);
        $user->forceFill(['email_verified_at'=>now()])->save();
        $roleId=DB::table('roles')->insertGetId([
            'key'=>'next11-'.$user->id,'name'=>'NEXT11 Test Role','system'=>true,
        ]);
        foreach($permissions as $permission){
            $permissionId=DB::table('permissions')->where('key',$permission)->value('id');
            if(!$permissionId)$permissionId=DB::table('permissions')->insertGetId([
                'key'=>$permission,'name'=>$permission,
            ]);
            DB::table('permission_role')->insert([
                'role_id'=>$roleId,'permission_id'=>$permissionId,
            ]);
        }
        $user->companies()->attach($company->id,[
            'role_id'=>$roleId,'status'=>'active','joined_at'=>now(),
        ]);
        return $user;
    }
    private function warehouse(Company $company):int
    {
        return DB::table('warehouses')->insertGetId([
            'company_id'=>$company->id,'active'=>true,
        ]);
    }
    private function connection(Company $company,string $provider='woocommerce'):int
    {
        $code=$provider==='woocommerce'?'SYN-WOO-01':'SYN-SHOP-01';
        $id=DB::table('commerce_connections')->insertGetId([
            'company_id'=>$company->id,'code'=>$code,
            'provider'=>$provider,'status'=>'draft',
            'created_at'=>now(),'updated_at'=>now(),
        ]);
        DB::table('commerce_sku_mappings')->insert([
            'company_id'=>$company->id,'connection_id'=>$id,
            'external_sku'=>'TAB-10070','internal_sku'=>'TAB-10070',
            'created_at'=>now(),'updated_at'=>now(),
        ]);
        return $id;
    }
    private function payload(Company $company,int $warehouseId,string $provider='woocommerce'):array
    {
        return [
            'demoOnly'=>true,'companyId'=>$company->id,
            'provider'=>$provider,
            'connectionCode'=>$provider==='woocommerce'?'SYN-WOO-01':'SYN-SHOP-01',
            'warehouseId'=>$warehouseId,
            'eventId'=>'SYN-DEMO-EVENT-001',
            'externalOrderId'=>'SYN-DEMO-ORDER-001','currency'=>'EUR',
            'lines'=>[['sku'=>'TAB-10070','quantity'=>1,'unitPriceCents'=>12500]],
            'totalCents'=>12500,
        ];
    }
    private function rejects(callable $fn):void
    {
        try{$fn();$this->fail('Expected synthetic operation to be rejected.');}
        catch(\DomainException $e){$this->assertNotSame('',$e->getMessage());}
    }

    public function test_contract_rejects_real_customer_fields_wrong_tenant_and_unbalanced_orders():void
    {
        $company=$this->company('Company A');
        $warehouse=$this->warehouse($company);
        $payload=$this->payload($company,$warehouse);
        $clean=CommerceOrderContract::normalize($payload,$company->id);
        $this->assertSame(12500,$clean['total_cents']);
        $this->assertFalse($clean['posting']);
        $this->assertTrue($clean['demo_only']);
        foreach([
            ['demoOnly'=>false],['companyId'=>999],['currency'=>'USD'],
            ['totalCents'=>12499],['billing'=>['email'=>'customer@example.test']],
            ['eventId'=>'REAL-001'],
            ['lines'=>[['sku'=>'TAB-10070','quantity'=>1,'unitPriceCents'=>12.5]]],
            ['provider'=>'unknown'],
        ] as $bad){
            $this->rejects(fn()=>CommerceOrderContract::normalize(
                [...$payload,...$bad],$company->id));
        }
    }

    public function test_business_units_are_company_scoped_and_warehouse_mapping_is_idempotent():void
    {
        $a=$this->company('Company A');
        $b=$this->company('Company B');
        $alice=$this->actor($a,'Alice',['inventory.write']);
        $bob=$this->actor($b,'Bob',['inventory.write']);
        $reader=$this->actor($a,'Reader',[]);
        $warehouseA=$this->warehouse($a);
        $warehouseB=$this->warehouse($b);
        $service=app(BusinessUnitRegistry::class);
        $first=$service->create($a->id,$alice->id,'PE-01','Demo poslovna enota Sever');
        $other=$service->create($b->id,$bob->id,'PE-01','Demo poslovna enota Vzhod');
        $this->assertNotSame($first,$other);
        $this->assertTrue($service->assignWarehouse($a->id,$alice->id,$first,$warehouseA));
        $this->assertFalse($service->assignWarehouse($a->id,$alice->id,$first,$warehouseA));
        $this->rejects(fn()=> $service->assignWarehouse($a->id,$alice->id,$first,$warehouseB));
        $this->rejects(fn()=> $service->assignWarehouse($a->id,$reader->id,$first,$warehouseA));
        $this->rejects(fn()=> $service->assignWarehouse($b->id,$bob->id,$first,$warehouseB));
        $this->assertDatabaseCount('business_units',2);
        $this->assertDatabaseCount('business_unit_warehouses',1);
        $this->assertDatabaseCount('audit_logs',3);
    }

    public function test_synthetic_inbox_is_off_by_default_and_requires_company_permission():void
    {
        $a=$this->company('Company A');
        $writer=$this->actor($a,'Writer',['orders.write']);
        $viewer=$this->actor($a,'Viewer',[]);
        $warehouse=$this->warehouse($a);
        $this->connection($a);
        $payload=$this->payload($a,$warehouse);
        $service=app(StageSyntheticCommerceOrder::class);
        $this->rejects(fn()=> $service->execute($a->id,$writer->id,$payload));
        config()->set('finai.synthetic_commerce_staging_enabled',true);
        $this->rejects(fn()=> $service->execute($a->id,$viewer->id,$payload));
        $this->assertDatabaseCount('commerce_order_events',0);
        $this->assertDatabaseCount('audit_logs',0);
    }

    public function test_shopify_and_woocommerce_normalize_and_replay_identically():void
    {
        config()->set('finai.synthetic_commerce_staging_enabled',true);
        $company=$this->company('Company A');
        $writer=$this->actor($company,'Writer',['orders.write']);
        $warehouse=$this->warehouse($company);
        $this->connection($company,'woocommerce');
        $this->connection($company,'shopify');
        $service=app(StageSyntheticCommerceOrder::class);
        foreach(['woocommerce','shopify'] as $provider){
            $payload=$this->payload($company,$warehouse,$provider);
            $first=$service->execute($company->id,$writer->id,$payload);
            $this->assertFalse($first['replayed']);
            $this->assertSame('review',$first['status']);
            $again=$service->execute($company->id,$writer->id,$payload);
            $this->assertSame($first['id'],$again['id']);
            $this->assertTrue($again['replayed']);
        }
        $this->assertDatabaseCount('commerce_order_events',2);
        $this->assertDatabaseCount('audit_logs',2);
        foreach(DB::table('commerce_order_events')->get() as $row){
            $normalized=json_decode($row->normalized_json,true,512,JSON_THROW_ON_ERROR);
            $this->assertFalse($normalized['posting']);
            $this->assertSame(12500,$normalized['total_cents']);
            $this->assertArrayNotHasKey('billing',$normalized);
        }
    }

    public function test_changed_duplicate_unknown_sku_and_cross_company_are_rejected():void
    {
        config()->set('finai.synthetic_commerce_staging_enabled',true);
        $a=$this->company('Company A');$b=$this->company('Company B');
        $alice=$this->actor($a,'Alice',['orders.write']);
        $bob=$this->actor($b,'Bob',['orders.write']);
        $warehouseA=$this->warehouse($a);
        $warehouseB=$this->warehouse($b);
        $this->connection($a);
        $this->connection($b);
        $service=app(StageSyntheticCommerceOrder::class);
        $payload=$this->payload($a,$warehouseA);
        $service->execute($a->id,$alice->id,$payload);
        $this->rejects(fn()=> $service->execute($a->id,$alice->id,[
            ...$payload,'totalCents'=>13500,
            'lines'=>[['sku'=>'TAB-10070','quantity'=>1,'unitPriceCents'=>13500]],
        ]));
        $this->rejects(fn()=> $service->execute($a->id,$alice->id,[
            ...$payload,'eventId'=>'SYN-DEMO-EVENT-002',
        ]));
        $this->rejects(fn()=> $service->execute($a->id,$alice->id,[
            ...$payload,'eventId'=>'SYN-DEMO-EVENT-003',
            'externalOrderId'=>'SYN-DEMO-ORDER-003',
            'lines'=>[['sku'=>'UNKNOWN','quantity'=>1,'unitPriceCents'=>12500]],
        ]));
        $this->rejects(fn()=> $service->execute($a->id,$alice->id,[
            ...$payload,'eventId'=>'SYN-DEMO-EVENT-004',
            'externalOrderId'=>'SYN-DEMO-ORDER-004',
            'warehouseId'=>$warehouseB,
        ]));
        $this->rejects(fn()=> $service->execute($a->id,$bob->id,[
            ...$payload,'eventId'=>'SYN-DEMO-EVENT-005',
            'externalOrderId'=>'SYN-DEMO-ORDER-005',
        ]));
        $this->assertDatabaseCount('commerce_order_events',1);
        $this->assertDatabaseCount('audit_logs',1);
    }

    public function test_failed_audit_write_rolls_back_staged_event_and_business_unit():void
    {
        config()->set('finai.synthetic_commerce_staging_enabled',true);
        $company=$this->company('Company A');
        $actor=$this->actor($company,'Writer',['orders.write','inventory.write']);
        $warehouse=$this->warehouse($company);
        $this->connection($company);
        Schema::drop('audit_logs'); // Only isolated in-memory SQLite schema.
        try{
            app(StageSyntheticCommerceOrder::class)->execute(
                $company->id,$actor->id,$this->payload($company,$warehouse));
            $this->fail('Missing audit logs should roll back commerce staging.');
        }catch(\Illuminate\Database\QueryException $e){
            $this->assertDatabaseCount('commerce_order_events',0);
        }
        try{
            app(BusinessUnitRegistry::class)->create(
                $company->id,$actor->id,'PE-01','Demo poslovna enota');
            $this->fail('Missing audit logs should roll back unit creation.');
        }catch(\Illuminate\Database\QueryException $e){
            $this->assertDatabaseCount('business_units',0);
        }
    }
}
