<?php

namespace App\Application\Inventory;

use App\Domain\Inventory\InventoryMath;
use Illuminate\Support\Facades\DB;

final class PostInventoryMovement
{
    public function execute(
        int $companyId,int $productId,int $warehouseId,int $locationId,
        string $type,float $quantity,string $sourceType,int $sourceId,int $userId,
        ?float $unitCost=null,?string $reference=null,?int $projectId=null
    ): int {
        if (! is_finite($quantity) || ($unitCost !== null
            && (! is_finite($unitCost) || $unitCost < 0))
            || $sourceId < 1 || trim($sourceType) === '') {
            throw new \DomainException('Invalid stock movement metadata.');
        }
        $incoming = in_array($type, ['receipt','transfer_in'], true);
        $outgoing = in_array($type, ['issue','transfer_out'], true);
        if (! $incoming && ! $outgoing && $type !== 'stock_count_adjustment') {
            throw new \DomainException('Unsupported inventory movement type.');
        }
        if (($incoming && $quantity <= 0) || ($outgoing && $quantity >= 0)) {
            throw new \DomainException('Movement type does not match signed quantity.');
        }
        InventoryMath::assertPositiveQuantity(abs($quantity));
        return DB::transaction(function () use (
            $companyId,$productId,$warehouseId,$locationId,$type,$quantity,
            $sourceType,$sourceId,$userId,$unitCost,$reference,$projectId
        ): int {
            InventoryTenantGuard::requireWriter($companyId,$userId);
            $product=DB::table('products')->where('id',$productId)
                ->where('company_id',$companyId)->where('active',true)->first();
            $warehouse=DB::table('warehouses')->where('id',$warehouseId)
                ->where('company_id',$companyId)->where('active',true)->first();
            $location=DB::table('warehouse_locations')->where('id',$locationId)
                ->where('warehouse_id',$warehouseId)->where('active',true)->first();
            if (! $product || ! $warehouse || ! $location) {
                throw new \DomainException('Stock movement references a foreign or inactive product/location.');
            }

            $balance=DB::table('inventory_balances')
                ->where('company_id',$companyId)->where('warehouse_id',$warehouseId)
                ->where('product_id',$productId)->where('warehouse_location_id',$locationId)
                ->lockForUpdate()->first();
            if (! $balance) {
                // SQL uniqueness on (warehouse,location,product) is the final concurrency guard.
                $balanceId=DB::table('inventory_balances')->insertGetId([
                    'company_id'=>$companyId,'warehouse_id'=>$warehouseId,
                    'warehouse_location_id'=>$locationId,'product_id'=>$productId,
                    'on_hand'=>0,'reserved'=>0,'available'=>0,'incoming'=>0,
                    'created_at'=>now(),'updated_at'=>now(),
                ]);
                $balance=DB::table('inventory_balances')->lockForUpdate()->find($balanceId);
            }
            $newOnHand=round((float)$balance->on_hand+$quantity,4);
            if ($newOnHand < -0.0001) {
                throw new \DomainException('Inventory movement would create negative stock.');
            }
            $newAvailable=InventoryMath::available($newOnHand,(float)$balance->reserved);
            if ($newAvailable < -0.0001) {
                throw new \DomainException('Inventory movement would violate active reservations.');
            }
            DB::table('inventory_balances')->where('id',$balance->id)
                ->where('company_id',$companyId)->update([
                    'on_hand'=>$newOnHand,'available'=>$newAvailable,
                    'average_cost'=>$unitCost ?? $balance->average_cost,
                    'updated_at'=>now(),
                ]);
            $id=DB::table('inventory_movements')->insertGetId([
                'company_id'=>$companyId,'project_id'=>$projectId,
                'product_id'=>$productId,'warehouse_id'=>$warehouseId,
                'warehouse_location_id'=>$locationId,'movement_type'=>$type,
                'quantity'=>$quantity,'unit_cost'=>$unitCost,
                'source_type'=>$sourceType,'source_id'=>$sourceId,
                'reference'=>$reference,'created_by'=>$userId,
                'occurred_at'=>now(),'created_at'=>now(),'updated_at'=>now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id'=>$companyId,'actor_user_id'=>$userId,
                'event_type'=>'inventory.movement_posted',
                'entity_type'=>'inventory_movement','entity_id'=>(string)$id,
                'metadata'=>json_encode([
                    'movement_type'=>$type,'product_id'=>$productId,
                    'warehouse_id'=>$warehouseId,'location_id'=>$locationId,
                    'quantity'=>$quantity,'source_type'=>$sourceType,
                    'source_id'=>$sourceId,
                ], JSON_THROW_ON_ERROR),
                'created_at'=>now(),
            ]);
            return $id;
        },3);
    }
}
