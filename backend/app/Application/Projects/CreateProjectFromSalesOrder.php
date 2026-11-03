<?php
namespace App\Application\Projects;

use Illuminate\Support\Facades\DB;

final class CreateProjectFromSalesOrder
{
    public function __construct(private AllocateProjectNumber $numbering) {}

    public function execute(int $salesOrderId,int $userId): int
    {
        return DB::transaction(function () use ($salesOrderId,$userId) {
            $order=DB::table('sales_orders')->lockForUpdate()->find($salesOrderId);
            if (! $order) throw new \DomainException('Sales order not found.');

            $existing=DB::table('projects')->where('sales_order_id',$salesOrderId)->first();
            if ($existing) return (int)$existing->id;

            $number=$this->numbering->execute($order->company_id,(int)now()->year);
            $projectId=DB::table('projects')->insertGetId([
                'company_id'=>$order->company_id,'partner_id'=>$order->partner_id,'sales_order_id'=>$order->id,
                'number'=>$number,'name'=>$order->number.' · projekt','status'=>'planned',
                'starts_on'=>now()->toDateString(),'due_on'=>$order->requested_delivery_date,
                'budget_revenue'=>$order->net_amount,'budget_cost'=>0,'owner_user_id'=>$order->owner_user_id ?? $userId,
                'created_by'=>$userId,'created_at'=>now(),'updated_at'=>now()
            ]);

            DB::table('project_events')->insert([
                'project_id'=>$projectId,'event_type'=>'created_from_sales_order','actor_user_id'=>$userId,
                'metadata'=>json_encode(['sales_order_id'=>$order->id]),'occurred_at'=>now(),
                'created_at'=>now(),'updated_at'=>now()
            ]);

            return $projectId;
        });
    }
}
