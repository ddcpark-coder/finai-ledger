<?php
namespace App\Application\Inventory;

use App\Domain\Inventory\InventoryMath;
use Illuminate\Support\Facades\DB;

final class IssueDeliveryNoteInventory
{
    public function __construct(private PostInventoryMovement $movements) {}

    public function execute(int $deliveryNoteId,int $warehouseId,int $locationId,int $userId): void
    {
        DB::transaction(function () use ($deliveryNoteId,$warehouseId,$locationId,$userId) {
            $note=DB::table('delivery_notes')->lockForUpdate()->find($deliveryNoteId);
            if (! $note || ! in_array($note->status,['completed','signed'],true)) {
                throw new \DomainException('Delivery note must be completed before inventory issue.');
            }

            $alreadyIssued=DB::table('inventory_movements')
                ->where('source_type','delivery_note')->where('source_id',$deliveryNoteId)->exists();
            if ($alreadyIssued) return;

            $warehouse=DB::table('warehouses')->where('id',$warehouseId)->where('company_id',$note->company_id)->where('active',true)->first();
            $location=DB::table('warehouse_locations')->where('id',$locationId)->where('warehouse_id',$warehouseId)->where('active',true)->first();
            if (! $warehouse || ! $location) throw new \DomainException('Invalid warehouse or location.');

            foreach(DB::table('delivery_note_lines')->where('delivery_note_id',$deliveryNoteId)->get() as $line){
                if (! $line->product_id) continue;
                $qty=(float)$line->quantity;
                InventoryMath::assertPositiveQuantity($qty);

                if ($line->sales_order_line_id) {
                    $reservation=DB::table('inventory_reservations')
                        ->where('sales_order_line_id',$line->sales_order_line_id)
                        ->where('warehouse_id',$warehouseId)
                        ->where('warehouse_location_id',$locationId)
                        ->where('status','active')->lockForUpdate()->first();

                    if ($reservation) {
                        $balance=DB::table('inventory_balances')
                            ->where('warehouse_id',$warehouseId)->where('warehouse_location_id',$locationId)
                            ->where('product_id',$line->product_id)->lockForUpdate()->first();
                        if (! $balance) throw new \DomainException('Inventory balance missing for reserved delivery.');

                        $release=min($qty,(float)$reservation->quantity);
                        DB::table('inventory_balances')->where('id',$balance->id)->update([
                            'reserved'=>max(0,round((float)$balance->reserved-$release,4)),
                            'available'=>InventoryMath::available((float)$balance->on_hand,max(0,(float)$balance->reserved-$release)),
                            'updated_at'=>now()
                        ]);

                        DB::table('inventory_reservations')->where('id',$reservation->id)->update([
                            'status'=>$release+0.0001 >= (float)$reservation->quantity ? 'consumed' : 'partial',
                            'quantity'=>max(0,round((float)$reservation->quantity-$release,4)),
                            'released_at'=>$release+0.0001 >= (float)$reservation->quantity ? now() : null,
                            'updated_at'=>now()
                        ]);
                    }
                }

                $this->movements->execute(
                    $note->company_id,$line->product_id,$warehouseId,$locationId,
                    'issue',-$qty,'delivery_note',$deliveryNoteId,$userId,null,$note->number,$note->project_id
                );
            }
        });
    }
}
