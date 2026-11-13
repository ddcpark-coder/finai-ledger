<?php

namespace Tests\Feature;

use App\Application\Inventory\ReserveSalesOrderInventory;
use App\Application\Inventory\IssueDeliveryNoteInventory;
use App\Application\Inventory\PostInventoryMovement;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class RealInventoryTransactionSyntheticTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // A minimal, isolated SQLite :memory: schema for real stock commands.
        // Production migration paths and real databases remain untouched.
        Schema::create('products', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id'); $t->boolean('active')->default(true);
        });
        Schema::create('warehouses', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id'); $t->boolean('active')->default(true);
        });
        Schema::create('warehouse_locations', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('warehouse_id'); $t->boolean('active')->default(true);
        });
        Schema::create('sales_orders', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id'); $t->string('status')->default('confirmed');
        });
        Schema::create('sales_order_lines', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('sales_order_id');
            $t->unsignedBigInteger('product_id'); $t->decimal('quantity',18,4);
        });
        Schema::create('sales_order_reservations', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('sales_order_line_id');
            $t->unsignedBigInteger('product_id'); $t->decimal('quantity',18,4);
            $t->string('status')->default('requested'); $t->timestamp('reserved_at')->nullable();
            $t->timestamps();
        });
        Schema::create('inventory_balances', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
            $t->unsignedBigInteger('warehouse_id'); $t->unsignedBigInteger('warehouse_location_id');
            $t->unsignedBigInteger('product_id'); $t->decimal('on_hand',18,4)->default(0);
            $t->decimal('reserved',18,4)->default(0); $t->decimal('available',18,4)->default(0);
            $t->decimal('incoming',18,4)->default(0); $t->decimal('average_cost',18,4)->nullable();
            $t->timestamps();
            $t->unique(['warehouse_id','warehouse_location_id','product_id'],'qa_stock_balance_unique');
        });
        Schema::create('inventory_reservations', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
            $t->unsignedBigInteger('sales_order_reservation_id');
            $t->unsignedBigInteger('sales_order_line_id'); $t->unsignedBigInteger('product_id');
            $t->unsignedBigInteger('warehouse_id'); $t->unsignedBigInteger('warehouse_location_id');
            $t->decimal('quantity',18,4); $t->string('status');
            $t->timestamp('reserved_at'); $t->timestamp('released_at')->nullable(); $t->timestamps();
        });
        Schema::create('delivery_notes', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id'); $t->unsignedBigInteger('sales_order_id')->nullable();
            $t->unsignedBigInteger('project_id')->nullable();
            $t->string('number'); $t->string('status')->default('completed');
        });
        Schema::create('delivery_note_lines', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('delivery_note_id');
            $t->unsignedBigInteger('sales_order_line_id')->nullable();
            $t->unsignedBigInteger('product_id')->nullable();
            $t->decimal('quantity',18,4);
        });
        Schema::create('inventory_movements', function (Blueprint $t): void {
            $t->id(); $t->unsignedBigInteger('company_id');
            $t->unsignedBigInteger('project_id')->nullable();
            $t->unsignedBigInteger('product_id'); $t->unsignedBigInteger('warehouse_id');
            $t->unsignedBigInteger('warehouse_location_id');
            $t->string('movement_type'); $t->decimal('quantity',18,4);
            $t->decimal('unit_cost',18,4)->nullable();
            $t->string('source_type'); $t->unsignedBigInteger('source_id');
            $t->string('reference')->nullable(); $t->unsignedBigInteger('created_by');
            $t->timestamp('occurred_at'); $t->timestamps();
        });
    }

    private function fixture(string $label = 'Company A', bool $writer = true): array
    {
        $company = Company::query()->create(['name'=>$label,'active'=>true]);
        $name = str_replace(' ', '-', strtolower($label)).($writer?'-writer':'-viewer');
        $user = User::query()->create([
            'name'=>$name,'email'=>$name.'@example.test',
            'password'=>'isolated-only-password', 'active'=>true,
        ]);
        $user->forceFill(['email_verified_at'=>now()])->save();
        $role=DB::table('roles')->insertGetId([
            'key'=>'qa-stock-'.$user->id, 'name'=>'Stock QA', 'system'=>true,
        ]);
        if ($writer) {
            $permission=DB::table('permissions')->where('key','inventory.write')->value('id');
            if (! $permission) $permission=DB::table('permissions')->insertGetId([
                'key'=>'inventory.write','name'=>'Inventory write',
            ]);
            DB::table('permission_role')->insert([
                'role_id'=>$role,'permission_id'=>$permission,
            ]);
        }
        $user->companies()->attach($company->id,[
            'role_id'=>$role,'status'=>'active','joined_at'=>now(),
        ]);
        $product=DB::table('products')->insertGetId([
            'company_id'=>$company->id,'active'=>true,
        ]);
        $warehouse=DB::table('warehouses')->insertGetId([
            'company_id'=>$company->id,'active'=>true,
        ]);
        $location=DB::table('warehouse_locations')->insertGetId([
            'warehouse_id'=>$warehouse,'active'=>true,
        ]);
        DB::table('inventory_balances')->insert([
            'company_id'=>$company->id,'product_id'=>$product,
            'warehouse_id'=>$warehouse,'warehouse_location_id'=>$location,
            'on_hand'=>12,'reserved'=>0,'available'=>12,'incoming'=>0,
            'created_at'=>now(),'updated_at'=>now(),
        ]);
        $order=DB::table('sales_orders')->insertGetId([
            'company_id'=>$company->id,'status'=>'confirmed',
        ]);
        $line=DB::table('sales_order_lines')->insertGetId([
            'sales_order_id'=>$order,'product_id'=>$product,'quantity'=>3,
        ]);
        $request=DB::table('sales_order_reservations')->insertGetId([
            'sales_order_line_id'=>$line,'product_id'=>$product,
            'quantity'=>3,'status'=>'requested','created_at'=>now(),'updated_at'=>now(),
        ]);
        return compact('company','user','product','warehouse','location','order','line','request');
    }

    private function delivery(array $fixture, float $qty, string $number): int
    {
        $id=DB::table('delivery_notes')->insertGetId([
            'company_id'=>$fixture['company']->id,
            'sales_order_id'=>$fixture['order'],
            'status'=>'completed','number'=>$number,
        ]);
        DB::table('delivery_note_lines')->insert([
            'delivery_note_id'=>$id,'sales_order_line_id'=>$fixture['line'],
            'product_id'=>$fixture['product'],'quantity'=>$qty,
        ]);
        return $id;
    }

    private function reject(callable $action): void
    {
        try{$action();$this->fail('Synthetic stock must reject invalid operation.');}
        catch (\DomainException $error){$this->assertNotSame('', $error->getMessage());}
    }

    public function test_real_reservation_delivery_issue_audit_and_repeat_are_atomic(): void
    {
        $f=$this->fixture();
        $id=app(ReserveSalesOrderInventory::class)->execute(
            $f['request'],$f['warehouse'],$f['location'],$f['user']->id
        );
        $this->assertDatabaseHas('inventory_reservations',[
            'id'=>$id,'company_id'=>$f['company']->id,'status'=>'active','quantity'=>3,
        ]);
        $this->assertDatabaseHas('inventory_balances',[
            'company_id'=>$f['company']->id,'on_hand'=>12,'reserved'=>3,'available'=>9,
        ]);
        $this->assertDatabaseCount('audit_logs',1);
        $this->reject(fn()=>app(ReserveSalesOrderInventory::class)->execute(
            $f['request'],$f['warehouse'],$f['location'],$f['user']->id));
        $note=$this->delivery($f,3,'SYN-DOB-001');
        $service=app(IssueDeliveryNoteInventory::class);
        $service->execute($note,$f['warehouse'],$f['location'],$f['user']->id);
        $this->assertDatabaseHas('inventory_balances',[
            'company_id'=>$f['company']->id,'on_hand'=>9,'reserved'=>0,'available'=>9,
        ]);
        $this->assertDatabaseHas('inventory_reservations',[
            'id'=>$id,'status'=>'consumed','quantity'=>0,
        ]);
        $this->assertDatabaseHas('inventory_movements',[
            'company_id'=>$f['company']->id,'movement_type'=>'issue','quantity'=>-3,
            'source_type'=>'delivery_note','source_id'=>$note,
        ]);
        $this->assertDatabaseCount('audit_logs',2);
        $service->execute($note,$f['warehouse'],$f['location'],$f['user']->id);
        $this->assertDatabaseCount('inventory_movements',1);
        $this->assertDatabaseCount('audit_logs',2);
    }

    public function test_two_partial_deliveries_preserve_remaining_reservation(): void
    {
        $f=$this->fixture();
        $id=app(ReserveSalesOrderInventory::class)->execute(
            $f['request'],$f['warehouse'],$f['location'],$f['user']->id);
        $service=app(IssueDeliveryNoteInventory::class);
        $first=$this->delivery($f,1.5,'SYN-DOB-001');
        $service->execute($first,$f['warehouse'],$f['location'],$f['user']->id);
        $this->assertDatabaseHas('inventory_reservations',[
            'id'=>$id,'quantity'=>1.5,'status'=>'active',
        ]);
        $this->assertDatabaseHas('inventory_balances',[
            'company_id'=>$f['company']->id,'on_hand'=>10.5,'reserved'=>1.5,'available'=>9,
        ]);
        $second=$this->delivery($f,1.5,'SYN-DOB-002');
        $service->execute($second,$f['warehouse'],$f['location'],$f['user']->id);
        $this->assertDatabaseHas('inventory_reservations',[
            'id'=>$id,'quantity'=>0,'status'=>'consumed',
        ]);
        $this->assertDatabaseHas('inventory_balances',[
            'company_id'=>$f['company']->id,'on_hand'=>9,'reserved'=>0,'available'=>9,
        ]);
        $this->assertDatabaseCount('inventory_movements',2);
        $this->assertDatabaseCount('audit_logs',3);
    }

    public function test_cross_company_product_location_and_user_permission_are_denied(): void
    {
        $a=$this->fixture('Company A');
        $b=$this->fixture('Company B');
        $this->reject(fn()=>app(ReserveSalesOrderInventory::class)->execute(
            $a['request'],$b['warehouse'],$b['location'],$a['user']->id));
        $this->reject(fn()=>app(ReserveSalesOrderInventory::class)->execute(
            $a['request'],$a['warehouse'],$b['location'],$a['user']->id));
        $this->reject(fn()=>app(ReserveSalesOrderInventory::class)->execute(
            $a['request'],$a['warehouse'],$a['location'],$b['user']->id));
        DB::table('sales_order_reservations')->where('id',$a['request'])->update([
            'product_id'=>$b['product'],
        ]);
        $this->reject(fn()=>app(ReserveSalesOrderInventory::class)->execute(
            $a['request'],$a['warehouse'],$a['location'],$a['user']->id));
        $this->assertDatabaseCount('inventory_reservations',0);
        $this->assertDatabaseCount('inventory_movements',0);
        $this->assertDatabaseCount('audit_logs',0);
    }

    public function test_over_reservation_invalid_movement_sign_and_negative_stock_fail(): void
    {
        $a=$this->fixture();
        DB::table('inventory_balances')->where('company_id',$a['company']->id)
            ->update(['available'=>2,'on_hand'=>2]);
        $this->reject(fn()=>app(ReserveSalesOrderInventory::class)->execute(
            $a['request'],$a['warehouse'],$a['location'],$a['user']->id));
        $service=app(PostInventoryMovement::class);
        $this->reject(fn()=> $service->execute(
            $a['company']->id,$a['product'],$a['warehouse'],$a['location'],
            'issue',+1,'synthetic',1,$a['user']->id));
        $this->reject(fn()=> $service->execute(
            $a['company']->id,$a['product'],$a['warehouse'],$a['location'],
            'issue',-3,'synthetic',1,$a['user']->id));
        $this->assertDatabaseCount('audit_logs',0);
        $this->assertDatabaseCount('inventory_movements',0);
        $this->assertDatabaseHas('inventory_balances',[
            'company_id'=>$a['company']->id,'on_hand'=>2,'available'=>2,
        ]);
    }

    public function test_missing_audit_table_rolls_back_reservation_and_stock_issue(): void
    {
        $a=$this->fixture();
        Schema::drop('audit_logs'); // Isolated SQLite only.
        try {
            app(ReserveSalesOrderInventory::class)->execute(
                $a['request'],$a['warehouse'],$a['location'],$a['user']->id);
            $this->fail('Reservation must roll back without audit.');
        } catch (\Illuminate\Database\QueryException $error) {
            $this->assertDatabaseHas('inventory_balances',[
                'company_id'=>$a['company']->id,'on_hand'=>12,'reserved'=>0,'available'=>12,
            ]);
            $this->assertDatabaseHas('sales_order_reservations',[
                'id'=>$a['request'],'status'=>'requested',
            ]);
            $this->assertDatabaseCount('inventory_reservations',0);
        }
        try {
            app(PostInventoryMovement::class)->execute(
                $a['company']->id,$a['product'],$a['warehouse'],$a['location'],
                'receipt',1,'synthetic',123,$a['user']->id);
            $this->fail('Movement must roll back without audit.');
        } catch (\Illuminate\Database\QueryException $error) {
            $this->assertDatabaseHas('inventory_balances',[
                'company_id'=>$a['company']->id,'on_hand'=>12,'reserved'=>0,'available'=>12,
            ]);
            $this->assertDatabaseCount('inventory_movements',0);
        }
    }
}
