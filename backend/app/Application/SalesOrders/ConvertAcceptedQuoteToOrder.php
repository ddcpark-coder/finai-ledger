<?php
namespace App\Application\SalesOrders;

use Illuminate\Support\Facades\DB;

final class ConvertAcceptedQuoteToOrder
{
    public function __construct(private AllocateSalesOrderNumber $numbering) {}

    public function execute(int $quoteId,int $userId): int
    {
        return DB::transaction(function () use ($quoteId,$userId) {
            $quote=DB::table('quotes')->lockForUpdate()->find($quoteId);
            if (! $quote || $quote->status!=='accepted') {
                throw new \DomainException('Only accepted quote can become an order.');
            }

            $existing=DB::table('sales_orders')->where('quote_id',$quoteId)->first();
            if ($existing) return (int)$existing->id;

            $number=$this->numbering->execute($quote->company_id,(int)now()->year);

            $orderId=DB::table('sales_orders')->insertGetId([
                'company_id'=>$quote->company_id,'partner_id'=>$quote->partner_id,'quote_id'=>$quoteId,
                'opportunity_id'=>$quote->opportunity_id,'number'=>$number,'status'=>'confirmed',
                'order_date'=>now()->toDateString(),'currency'=>$quote->currency,'net_amount'=>$quote->net_amount,
                'tax_amount'=>$quote->tax_amount,'gross_amount'=>$quote->gross_amount,'created_by'=>$userId,
                'owner_user_id'=>$userId,'created_at'=>now(),'updated_at'=>now()
            ]);

            foreach(DB::table('quote_lines')->where('quote_id',$quoteId)->orderBy('line_no')->get() as $line){
                $lineId=DB::table('sales_order_lines')->insertGetId([
                    'sales_order_id'=>$orderId,'product_id'=>$line->product_id,'line_no'=>$line->line_no,
                    'description'=>$line->description,'quantity'=>$line->quantity,'unit'=>$line->unit,
                    'unit_price'=>$line->unit_price,'discount_percent'=>$line->discount_percent,
                    'net_amount'=>$line->net_amount,'tax_rate'=>$line->tax_rate,'tax_amount'=>$line->tax_amount,
                    'gross_amount'=>$line->gross_amount,'tax_code_id'=>$line->tax_code_id,'created_at'=>now(),'updated_at'=>now()
                ]);

                if ($line->product_id) {
                    $product=DB::table('products')->where('id',$line->product_id)->where('company_id',$quote->company_id)->first();
                    if ($product?->track_inventory) {
                        DB::table('sales_order_reservations')->insert([
                            'sales_order_line_id'=>$lineId,'product_id'=>$line->product_id,'quantity'=>$line->quantity,
                            'status'=>'requested','created_at'=>now(),'updated_at'=>now()
                        ]);
                    }
                }
            }

            DB::table('sales_order_events')->insert([
                'sales_order_id'=>$orderId,'event_type'=>'created_from_quote','actor_user_id'=>$userId,
                'metadata'=>json_encode(['quote_id'=>$quoteId]),'occurred_at'=>now(),'created_at'=>now(),'updated_at'=>now()
            ]);

            return $orderId;
        });
    }
}
