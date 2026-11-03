<?php
namespace App\Application\Inventory;

use Illuminate\Support\Facades\DB;

final class GetInventoryAvailability
{
    public function execute(int $companyId,int $productId): array
    {
        $rows=DB::table('inventory_balances as b')
            ->join('warehouses as w','w.id','=','b.warehouse_id')
            ->join('warehouse_locations as l','l.id','=','b.warehouse_location_id')
            ->where('b.company_id',$companyId)->where('b.product_id',$productId)
            ->where('w.active',true)->where('l.active',true)
            ->orderByDesc('b.available')
            ->limit(100)
            ->get([
                'b.warehouse_id','w.code as warehouse_code','w.name as warehouse_name',
                'b.warehouse_location_id','l.code as location_code',
                'b.on_hand','b.reserved','b.available','b.incoming'
            ]);

        return [
            'total_on_hand'=>(string)$rows->sum('on_hand'),
            'total_reserved'=>(string)$rows->sum('reserved'),
            'total_available'=>(string)$rows->sum('available'),
            'total_incoming'=>(string)$rows->sum('incoming'),
            'locations'=>$rows->map(fn($x)=>(array)$x)->all(),
        ];
    }
}
