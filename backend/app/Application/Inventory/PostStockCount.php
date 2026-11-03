<?php
namespace App\Application\Inventory;

use Illuminate\Support\Facades\DB;

final class PostStockCount
{
    public function __construct(private PostInventoryMovement $movements) {}

    public function execute(int $stockCountId,int $userId): void
    {
        DB::transaction(function () use ($stockCountId,$userId) {
            $count=DB::table('stock_counts')->lockForUpdate()->find($stockCountId);
            if (! $count || $count->status!=='draft') throw new \DomainException('Stock count is not open.');

            foreach(DB::table('stock_count_lines')->where('stock_count_id',$stockCountId)->get() as $line){
                if ($line->counted_quantity===null) throw new \DomainException('All stock count lines require counted quantity.');

                $difference=round((float)$line->counted_quantity-(float)$line->system_quantity,4);
                DB::table('stock_count_lines')->where('id',$line->id)->update(['difference'=>$difference,'updated_at'=>now()]);

                if (abs($difference)>0.0001) {
                    $this->movements->execute(
                        $count->company_id,$line->product_id,$count->warehouse_id,$line->warehouse_location_id,
                        'stock_count_adjustment',$difference,'stock_count_line',$line->id,$userId,null,$count->number
                    );
                }
            }

            DB::table('stock_counts')->where('id',$stockCountId)->update([
                'status'=>'posted','posted_by'=>$userId,'posted_at'=>now(),'updated_at'=>now()
            ]);
        });
    }
}
