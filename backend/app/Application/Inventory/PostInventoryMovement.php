<?php
namespace App\Application\Inventory;

use App\Domain\Inventory\InventoryMath;
use Illuminate\Support\Facades\DB;

final class PostInventoryMovement
{
    public function execute(
        int $companyId,int $productId,int $warehouseId,int $locationId,
        string $type,float $quantity,string $sourceType,int $sourceId,int $userId,
        ?float $unitCost=null,?string $reference=null
    ): int {
        InventoryMath::assertPositiveQuantity(abs($quantity));

        return DB::transaction(function () use (
            $companyId,$productId,$warehouseId,$locationId,$type,$quantity,
            $sourceType,$sourceId,$userId,$unitCost,$reference
        ) {
            $product=DB::table('products')->where('id',$productId)->where('company_id',$companyId)->where('active',true)->first();
            $warehouse=DB::table('warehouses')->where('id',$warehouseId)->where('company_id',$companyId)->where('active',true)->first();
            if (! $product || ! $warehouse) throw new \DomainException('Invalid product or warehouse.');

            $location=DB::table('warehouse_locations')->where('id',$locationId)->where('warehouse_id',$warehouseId)->where('active',true)->first();
            if (! $location) throw new \DomainException('Invalid warehouse location.');

            $balance=DB::table('inventory_balances')
                ->where('warehouse_id',$warehouseId)->where('product_id',$productId)
                ->where('warehouse_location_id',$locationId)->lockForUpdate()->first();

            if (! $balance) {
                $balanceId=DB::table('inventory_balances')->insertGetId([
                    'company_id'=>$companyId,'warehouse_id'=>$warehouseId,'warehouse_location_id'=>$locationId,
                    'product_id'=>$productId,'on_hand'=>0,'reserved'=>0,'available'=>0,'incoming'=>0,
                    'created_at'=>now(),'updated_at'=>now()
                ]);
                $balance=DB::table('inventory_balances')->lockForUpdate()->find($balanceId);
            }

            $newOnHand=round((float)$balance->on_hand+$quantity,4);
            if ($newOnHand < -0.0001) throw new \DomainException('Inventory movement would create negative stock.');

            $newAvailable=InventoryMath::available($newOnHand,(float)$balance->reserved);
            if ($newAvailable < -0.0001) throw new \DomainException('Inventory movement would violate active reservations.');

            DB::table('inventory_balances')->where('id',$balance->id)->update([
                'on_hand'=>$newOnHand,'available'=>$newAvailable,
                'average_cost'=>$unitCost ?? $balance->average_cost,'updated_at'=>now()
            ]);

            return DB::table('inventory_movements')->insertGetId([
                'company_id'=>$companyId,'product_id'=>$productId,'warehouse_id'=>$warehouseId,
                'warehouse_location_id'=>$locationId,'movement_type'=>$type,'quantity'=>$quantity,
                'unit_cost'=>$unitCost,'source_type'=>$sourceType,'source_id'=>$sourceId,'reference'=>$reference,
                'created_by'=>$userId,'occurred_at'=>now(),'created_at'=>now(),'updated_at'=>now()
            ]);
        });
    }
}
