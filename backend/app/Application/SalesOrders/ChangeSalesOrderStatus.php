<?php
namespace App\Application\SalesOrders;

use App\Domain\SalesOrders\SalesOrderValidator;
use Illuminate\Support\Facades\DB;

final class ChangeSalesOrderStatus
{
    public function execute(int $orderId,string $to,int $userId): void
    {
        DB::transaction(function () use ($orderId,$to,$userId) {
            $order=DB::table('sales_orders')->lockForUpdate()->find($orderId);
            if (! $order) throw new \DomainException('Sales order not found.');

            SalesOrderValidator::assertProgress($order->status,$to);

            DB::table('sales_orders')->where('id',$orderId)->update([
                'status'=>$to,'completed_at'=>$to==='completed'?now():$order->completed_at,'updated_at'=>now()
            ]);

            DB::table('sales_order_events')->insert([
                'sales_order_id'=>$orderId,'event_type'=>'status_changed','actor_user_id'=>$userId,
                'metadata'=>json_encode(['from'=>$order->status,'to'=>$to]),'occurred_at'=>now(),
                'created_at'=>now(),'updated_at'=>now()
            ]);
        });
    }
}
