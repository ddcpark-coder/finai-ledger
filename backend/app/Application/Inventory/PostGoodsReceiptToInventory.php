<?php
namespace App\Application\Inventory;

use Illuminate\Support\Facades\DB;

final class PostGoodsReceiptToInventory
{
    public function __construct(private PostInventoryMovement $movements) {}

    public function execute(int $goodsReceiptId,int $userId,int $locationId): void
    {
        $receipt=DB::table('goods_receipts')->find($goodsReceiptId);
        if (! $receipt || ! $receipt->warehouse_id) {
            throw new \DomainException('Goods receipt has no warehouse.');
        }

        $order=DB::table('purchase_orders')->find($receipt->purchase_order_id);
        foreach (DB::table('goods_receipt_lines as grl')
            ->join('purchase_order_lines as pol','pol.id','=','grl.purchase_order_line_id')
            ->where('grl.goods_receipt_id',$goodsReceiptId)
            ->select('grl.*','pol.product_id','pol.unit_price')->get() as $line) {
            if (! $line->product_id) continue;

            $accepted=max(0,(float)$line->received_quantity-(float)$line->rejected_quantity);
            if ($accepted<=0) continue;

            $exists=DB::table('inventory_movements')
                ->where('source_type','goods_receipt_line')->where('source_id',$line->id)->exists();
            if ($exists) continue;

            $this->movements->execute(
                $receipt->company_id,$line->product_id,$receipt->warehouse_id,$locationId,
                'receipt',$accepted,'goods_receipt_line',$line->id,$userId,
                (float)$line->unit_price,$order?->number,$order?->project_id
            );
        }
    }
}
