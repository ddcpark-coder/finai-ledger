<?php

namespace App\Application\Organization;

use App\Application\Integrations\CompanyWorkflowAccess;
use Illuminate\Support\Facades\DB;

final class BusinessUnitRegistry
{
    public function create(int $companyId,int $actorId,string $code,string $name): int
    {
        $code=trim($code);$name=trim($name);
        if(! preg_match('/^[A-Z0-9-]{2,24}$/D',$code)
            || mb_strlen($name)<3||mb_strlen($name)>120)
            throw new \DomainException('Invalid business unit code or name.');
        return DB::transaction(function()use($companyId,$actorId,$code,$name):int{
            CompanyWorkflowAccess::requirePermission($companyId,$actorId,'inventory.write');
            $exists=DB::table('business_units')
                ->where('company_id',$companyId)->where('code',$code)->exists();
            if($exists)throw new \DomainException('Business unit code already exists.');
            $id=DB::table('business_units')->insertGetId([
                'company_id'=>$companyId,'code'=>$code,'name'=>$name,
                'active'=>true,'created_at'=>now(),'updated_at'=>now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id'=>$companyId,'actor_user_id'=>$actorId,
                'event_type'=>'business_unit.created','entity_type'=>'business_unit',
                'entity_id'=>(string)$id,
                'metadata'=>json_encode(['code'=>$code],JSON_THROW_ON_ERROR),
                'created_at'=>now(),
            ]);
            return $id;
        },3);
    }

    public function assignWarehouse(int $companyId,int $actorId,int $unitId,
        int $warehouseId): bool
    {
        return DB::transaction(function()use($companyId,$actorId,$unitId,
            $warehouseId):bool{
            CompanyWorkflowAccess::requirePermission($companyId,$actorId,'inventory.write');
            $unit=DB::table('business_units')->where('id',$unitId)
                ->where('company_id',$companyId)->where('active',true)
                ->lockForUpdate()->first();
            $warehouse=DB::table('warehouses')->where('id',$warehouseId)
                ->where('company_id',$companyId)->where('active',true)
                ->lockForUpdate()->first();
            if(!$unit||!$warehouse)throw new \DomainException('Foreign or inactive warehouse/unit.');
            $existing=DB::table('business_unit_warehouses')
                ->where('warehouse_id',$warehouseId)->lockForUpdate()->first();
            if($existing){
                if((int)$existing->company_id!==$companyId
                    ||(int)$existing->business_unit_id!==$unitId)
                    throw new \DomainException('Warehouse belongs to another business unit.');
                return false; // Exact replay is idempotent.
            }
            DB::table('business_unit_warehouses')->insert([
                'company_id'=>$companyId,'business_unit_id'=>$unitId,
                'warehouse_id'=>$warehouseId,'created_at'=>now(),'updated_at'=>now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id'=>$companyId,'actor_user_id'=>$actorId,
                'event_type'=>'business_unit.warehouse_assigned',
                'entity_type'=>'business_unit','entity_id'=>(string)$unitId,
                'metadata'=>json_encode(['warehouse_id'=>$warehouseId],JSON_THROW_ON_ERROR),
                'created_at'=>now(),
            ]);
            return true;
        },3);
    }
}
