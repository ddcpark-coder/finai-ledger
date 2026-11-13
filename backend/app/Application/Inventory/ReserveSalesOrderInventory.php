<?php

namespace App\Application\Inventory;

use App\Domain\Inventory\InventoryMath;
use Illuminate\Support\Facades\DB;

final class ReserveSalesOrderInventory
{
    public function execute(int $salesOrderReservationId,int $warehouseId,int $locationId,
        int $userId): int
    {
        return DB::transaction(function () use (
            $salesOrderReservationId,$warehouseId,$locationId,$userId
        ): int {
            $request=DB::table('sales_order_reservations')->lockForUpdate()
                ->find($salesOrderReservationId);
            if (! $request || $request->status !== 'requested') {
                throw new \DomainException('Reservation request is not available.');
            }
            $line=DB::table('sales_order_lines')->find($request->sales_order_line_id);
            $order=$line ? DB::table('sales_orders')->find($line->sales_order_id) : null;
            if (! $line || ! $order ||
                ! in_array($order->status,[
                    'confirmed','in_progress','ready_for_delivery','partially_delivered'
                ],true) || (int)$line->product_id !== (int)$request->product_id) {
                throw new \DomainException('Reservation references an invalid sales order line.');
            }
            $companyId=(int)$order->company_id;
            InventoryTenantGuard::requireWriter($companyId,$userId);
            $product=DB::table('products')->where('id',$request->product_id)
                ->where('company_id',$companyId)->where('active',true)->first();
            $warehouse=DB::table('warehouses')->where('id',$warehouseId)
                ->where('company_id',$companyId)->where('active',true)->first();
            $location=DB::table('warehouse_locations')->where('id',$locationId)
                ->where('warehouse_id',$warehouseId)->where('active',true)->first();
            if (! $product || ! $warehouse || ! $location) {
                throw new \DomainException('Reservation contains a foreign or inactive product/location.');
            }
            $qty=(float)$request->quantity;
            if (! is_finite($qty) || $qty>(float)$line->quantity+0.0001) {
                throw new \DomainException('Requested quantity exceeds the sales line.');
            }
            InventoryMath::assertPositiveQuantity($qty);
            $balance=DB::table('inventory_balances')
                ->where('company_id',$companyId)
                ->where('warehouse_id',$warehouseId)->where('product_id',$request->product_id)
                ->where('warehouse_location_id',$locationId)->lockForUpdate()->first();
            if (! $balance) {
                throw new \DomainException('No inventory balance exists for reservation.');
            }
            InventoryMath::assertCanReserve((float)$balance->available,$qty);
            $newReserved=round((float)$balance->reserved+$qty,4);
            DB::table('inventory_balances')->where('id',$balance->id)
                ->where('company_id',$companyId)->update([
                    'reserved'=>$newReserved,
                    'available'=>InventoryMath::available((float)$balance->on_hand,$newReserved),
                    'updated_at'=>now(),
                ]);
            $id=DB::table('inventory_reservations')->insertGetId([
                'company_id'=>$companyId,'sales_order_reservation_id'=>$request->id,
                'sales_order_line_id'=>$line->id,'product_id'=>$request->product_id,
                'warehouse_id'=>$warehouseId,'warehouse_location_id'=>$locationId,
                'quantity'=>$qty,'status'=>'active','reserved_at'=>now(),
                'created_at'=>now(),'updated_at'=>now(),
            ]);
            $changed=DB::table('sales_order_reservations')->where('id',$request->id)
                ->where('status','requested')->update([
                    'status'=>'reserved','reserved_at'=>now(),'updated_at'=>now(),
                ]);
            if ($changed !== 1)throw new \DomainException('Concurrent reservation rejected.');
            DB::table('audit_logs')->insert([
                'company_id'=>$companyId,'actor_user_id'=>$userId,
                'event_type'=>'inventory.reserved',
                'entity_type'=>'inventory_reservation','entity_id'=>(string)$id,
                'metadata'=>json_encode([
                    'order_id'=>$order->id,'product_id'=>$request->product_id,
                    'quantity'=>$qty,'warehouse_id'=>$warehouseId,
                    'location_id'=>$locationId,
                ], JSON_THROW_ON_ERROR),
                'created_at'=>now(),
            ]);
            return $id;
        },3);
    }
}
