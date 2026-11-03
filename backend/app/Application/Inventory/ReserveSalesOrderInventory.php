<?php
namespace App\Application\Inventory;

use App\Domain\Inventory\InventoryMath;
use Illuminate\Support\Facades\DB;

final class ReserveSalesOrderInventory
{
    public function execute(int $salesOrderReservationId,int $warehouseId,int $locationId,int $userId): int
    {
        return DB::transaction(function () use ($salesOrderReservationId,$warehouseId,$locationId) {
            $request=DB::table('sales_order_reservations')->lockForUpdate()->find($salesOrderReservationId);
            if (! $request || $request->status!=='requested') throw new \DomainException('Reservation request is not available.');

            $line=DB::table('sales_order_lines')->find($request->sales_order_line_id);
            $order=DB::table('sales_orders')->find($line->sales_order_id);
            $warehouse=DB::table('warehouses')->where('id',$warehouseId)->where('company_id',$order->company_id)->where('active',true)->first();
            if (! $warehouse) throw new \DomainException('Invalid warehouse.');

            $balance=DB::table('inventory_balances')
                ->where('warehouse_id',$warehouseId)->where('product_id',$request->product_id)
                ->where('warehouse_location_id',$locationId)->lockForUpdate()->first();

            if (! $balance) throw new \DomainException('No inventory balance exists for reservation.');

            $qty=(float)$request->quantity;
            InventoryMath::assertCanReserve((float)$balance->available,$qty);

            DB::table('inventory_balances')->where('id',$balance->id)->update([
                'reserved'=>round((float)$balance->reserved+$qty,4),
                'available'=>InventoryMath::available((float)$balance->on_hand,(float)$balance->reserved+$qty),
                'updated_at'=>now()
            ]);

            $id=DB::table('inventory_reservations')->insertGetId([
                'company_id'=>$order->company_id,'sales_order_reservation_id'=>$request->id,
                'sales_order_line_id'=>$line->id,'product_id'=>$request->product_id,'warehouse_id'=>$warehouseId,
                'warehouse_location_id'=>$locationId,'quantity'=>$qty,'status'=>'active',
                'reserved_at'=>now(),'created_at'=>now(),'updated_at'=>now()
            ]);

            DB::table('sales_order_reservations')->where('id',$request->id)->update([
                'status'=>'reserved','reserved_at'=>now(),'updated_at'=>now()
            ]);

            return $id;
        });
    }
}
