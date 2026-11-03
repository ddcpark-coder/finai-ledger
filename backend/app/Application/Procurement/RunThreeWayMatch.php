<?php
namespace App\Application\Procurement;

use Illuminate\Support\Facades\DB;

final class RunThreeWayMatch
{
    public function execute(int $purchaseOrderId,int $incomingInvoiceId): array
    {
        return DB::transaction(function () use ($purchaseOrderId,$incomingInvoiceId) {
            $order=DB::table('purchase_orders')->find($purchaseOrderId);
            $invoice=DB::table('incoming_invoices')->find($incomingInvoiceId);

            if (! $order || ! $invoice || $order->company_id !== $invoice->company_id) {
                throw new \DomainException('Purchase order and invoice must belong to the same company.');
            }

            if ($order->partner_id !== $invoice->partner_id) {
                throw new \DomainException('Supplier mismatch between purchase order and invoice.');
            }

            $ordered=(float)DB::table('purchase_order_lines')->where('purchase_order_id',$purchaseOrderId)->sum('ordered_quantity');
            $received=(float)DB::table('goods_receipt_lines as grl')
                ->join('goods_receipts as gr','gr.id','=','grl.goods_receipt_id')
                ->where('gr.purchase_order_id',$purchaseOrderId)->sum('grl.received_quantity');
            $orderedNet=(float)$order->net_amount;
            $invoiceNet=(float)($invoice->net_amount ?? 0);

            $quantityVariance=round($received-$ordered,4);
            $priceVariance=round($invoiceNet-$orderedNet,2);
            $totalVariance=round((float)($invoice->gross_amount ?? 0)-(float)$order->gross_amount,2);

            $status=(abs($quantityVariance)<0.0001 && abs($priceVariance)<0.01 && abs($totalVariance)<0.01)
                ? 'matched' : 'variance';

            $details=[
                'ordered_quantity'=>$ordered,
                'received_quantity'=>$received,
                'ordered_net'=>$orderedNet,
                'invoice_net'=>$invoiceNet,
            ];

            DB::table('purchase_invoice_matches')->updateOrInsert(
                ['purchase_order_id'=>$purchaseOrderId,'incoming_invoice_id'=>$incomingInvoiceId],
                [
                    'status'=>$status,'quantity_variance'=>$quantityVariance,'price_variance'=>$priceVariance,
                    'total_variance'=>$totalVariance,'details_json'=>json_encode($details),
                    'updated_at'=>now(),'created_at'=>now()
                ]
            );

            return compact('status','quantityVariance','priceVariance','totalVariance','details');
        });
    }
}
