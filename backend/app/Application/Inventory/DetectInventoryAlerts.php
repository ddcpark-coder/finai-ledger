<?php
namespace App\Application\Inventory;

use Illuminate\Support\Facades\DB;

final class DetectInventoryAlerts
{
    public function execute(int $companyId): int
    {
        $products=DB::table('products')->where('company_id',$companyId)->where('track_inventory',true)->where('active',true)->get();
        $created=0;

        foreach($products as $product){
            $available=(float)DB::table('inventory_balances')->where('company_id',$companyId)->where('product_id',$product->id)->sum('available');
            $minimum=(float)($product->min_stock_level ?? 0);

            if ($available < $minimum) {
                $exists=DB::table('inventory_alerts')->where('company_id',$companyId)->where('product_id',$product->id)
                    ->where('type','below_minimum')->where('status','open')->exists();
                if (! $exists) {
                    DB::table('inventory_alerts')->insert([
                        'company_id'=>$companyId,'product_id'=>$product->id,'type'=>'below_minimum','severity'=>'warning',
                        'status'=>'open','details_json'=>json_encode(['available'=>$available,'minimum'=>$minimum]),
                        'detected_at'=>now(),'created_at'=>now(),'updated_at'=>now()
                    ]);
                    $created++;
                }
            }
        }

        return $created;
    }
}
