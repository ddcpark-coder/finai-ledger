<?php
namespace App\Application\Procurement;

use Illuminate\Support\Facades\DB;

final class ReceivePurchaseOrder
{
    public function execute(int $purchaseOrderId,array $lines,int $userId,?string $supplierDeliveryNote=null): int
    {
        return DB::transaction(function () use ($purchaseOrderId,$lines,$userId,$supplierDeliveryNote) {
            $order=DB::table('purchase_orders')->lockForUpdate()->find($purchaseOrderId);
            if (! $order || ! in_array($order->status,['approved','ordered','partially_received'],true)) {
                throw new \DomainException('Purchase order cannot be received in current state.');
            }

            $receiptNo='GR-'.$order->number.'-'.(DB::table('goods_receipts')->where('purchase_order_id',$purchaseOrderId)->count()+1);
            $receiptId=DB::table('goods_receipts')->insertGetId([
                'company_id'=>$order->company_id,'purchase_order_id'=>$purchaseOrderId,'number'=>$receiptNo,
                'received_on'=>now()->toDateString(),'supplier_delivery_note'=>$supplierDeliveryNote,
                'status'=>'received','received_by'=>$userId,'created_at'=>now(),'updated_at'=>now()
            ]);

            foreach($lines as $line){
                $poLine=DB::table('purchase_order_lines')->lockForUpdate()->find($line['purchase_order_line_id']);
                if (! $poLine || $poLine->purchase_order_id !== $purchaseOrderId) {
                    throw new \DomainException('Invalid purchase order line.');
                }

                $qty=(float)$line['received_quantity'];
                if ($qty<=0 || (float)$poLine->received_quantity+$qty > (float)$poLine->ordered_quantity+0.0001) {
                    throw new \DomainException('Received quantity exceeds open purchase order quantity.');
                }

                DB::table('goods_receipt_lines')->insert([
                    'goods_receipt_id'=>$receiptId,'purchase_order_line_id'=>$poLine->id,
                    'received_quantity'=>$qty,'rejected_quantity'=>(float)($line['rejected_quantity']??0),
                    'quality_status'=>$line['quality_status']??'accepted','created_at'=>now(),'updated_at'=>now()
                ]);

                DB::table('purchase_order_lines')->where('id',$poLine->id)->update([
                    'received_quantity'=>(float)$poLine->received_quantity+$qty,'updated_at'=>now()
                ]);
            }

            $remaining=(float)DB::table('purchase_order_lines')
                ->where('purchase_order_id',$purchaseOrderId)
                ->selectRaw('SUM(ordered_quantity-received_quantity) as remaining')->value('remaining');

            DB::table('purchase_orders')->where('id',$purchaseOrderId)->update([
                'status'=>$remaining<=0.0001?'received':'partially_received','updated_at'=>now()
            ]);

            return $receiptId;
        });
    }
}
