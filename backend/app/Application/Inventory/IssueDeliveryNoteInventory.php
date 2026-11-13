<?php

namespace App\Application\Inventory;

use App\Domain\Inventory\InventoryMath;
use Illuminate\Support\Facades\DB;

final class IssueDeliveryNoteInventory
{
    public function __construct(private PostInventoryMovement $movements) {}

    public function execute(int $deliveryNoteId,int $warehouseId,int $locationId,int $userId): void
    {
        DB::transaction(function () use ($deliveryNoteId,$warehouseId,$locationId,$userId): void {
            $note=DB::table('delivery_notes')->lockForUpdate()->find($deliveryNoteId);
            if (! $note || ! in_array($note->status,['completed','signed'],true)) {
                throw new \DomainException('Delivery note must be completed before inventory issue.');
            }
            $companyId=(int)$note->company_id;
            InventoryTenantGuard::requireWriter($companyId,$userId);
            if (DB::table('inventory_movements')->where('company_id',$companyId)
                ->where('source_type','delivery_note')->where('source_id',$deliveryNoteId)
                ->exists()) return; // exact same note, no new stock effect

            $warehouse=DB::table('warehouses')->where('id',$warehouseId)
                ->where('company_id',$companyId)->where('active',true)->first();
            $location=DB::table('warehouse_locations')->where('id',$locationId)
                ->where('warehouse_id',$warehouseId)->where('active',true)->first();
            if (! $warehouse || ! $location) {
                throw new \DomainException('Invalid warehouse or location.');
            }
            if ($note->sales_order_id && ! DB::table('sales_orders')
                ->where('id',$note->sales_order_id)->where('company_id',$companyId)->exists()) {
                throw new \DomainException('Delivery note references another company order.');
            }
            $lines=DB::table('delivery_note_lines')
                ->where('delivery_note_id',$deliveryNoteId)->get();
            foreach($lines as $line) {
                if (! $line->product_id) continue;
                $product=DB::table('products')->where('id',$line->product_id)
                    ->where('company_id',$companyId)->where('active',true)->first();
                if (! $product) throw new \DomainException('Foreign product in delivery.');
                if ($line->sales_order_line_id) {
                    $salesLine=DB::table('sales_order_lines')
                        ->where('id',$line->sales_order_line_id)->first();
                    $order=$salesLine?DB::table('sales_orders')
                        ->where('id',$salesLine->sales_order_id)
                        ->where('company_id',$companyId)->first():null;
                    if (! $order || !$salesLine ||
                        (int)$salesLine->product_id!==(int)$line->product_id ||
                        ($note->sales_order_id &&
                            (int)$note->sales_order_id!==(int)$order->id)) {
                        throw new \DomainException('Delivery line does not belong to company sales order.');
                    }
                }
                $qty=(float)$line->quantity;
                if (! is_finite($qty)) throw new \DomainException('Invalid delivery quantity.');
                InventoryMath::assertPositiveQuantity($qty);
                if ($line->sales_order_line_id) {
                    $reservation=DB::table('inventory_reservations')
                        ->where('company_id',$companyId)
                        ->where('sales_order_line_id',$line->sales_order_line_id)
                        ->where('product_id',$line->product_id)
                        ->where('warehouse_id',$warehouseId)
                        ->where('warehouse_location_id',$locationId)
                        ->where('status','active')->lockForUpdate()->first();
                    if ($reservation) {
                        $balance=DB::table('inventory_balances')
                            ->where('company_id',$companyId)
                            ->where('warehouse_id',$warehouseId)
                            ->where('warehouse_location_id',$locationId)
                            ->where('product_id',$line->product_id)
                            ->lockForUpdate()->first();
                        if (! $balance)throw new \DomainException('Inventory balance missing for reserved delivery.');
                        $release=min($qty,(float)$reservation->quantity);
                        if ((float)$balance->reserved+0.0001<$release) {
                            throw new \DomainException('Reserved balance was changed.');
                        }
                        $remaining=max(0,round((float)$reservation->quantity-$release,4));
                        $newReserved=max(0,round((float)$balance->reserved-$release,4));
                        DB::table('inventory_balances')->where('id',$balance->id)
                            ->where('company_id',$companyId)->update([
                                'reserved'=>$newReserved,
                                'available'=>InventoryMath::available(
                                    (float)$balance->on_hand,$newReserved),
                                'updated_at'=>now(),
                            ]);
                        DB::table('inventory_reservations')->where('id',$reservation->id)
                            ->where('company_id',$companyId)->update([
                                // Remain active for partial deliveries of a reservation.
                                'status'=>$remaining<=0.0001?'consumed':'active',
                                'quantity'=>$remaining,
                                'released_at'=>$remaining<=0.0001?now():null,
                                'updated_at'=>now(),
                            ]);
                    }
                }
                $this->movements->execute(
                    $companyId,$line->product_id,$warehouseId,$locationId,
                    'issue',-$qty,'delivery_note',$deliveryNoteId,$userId,
                    null,$note->number,$note->project_id
                );
            }
        },3);
    }
}
