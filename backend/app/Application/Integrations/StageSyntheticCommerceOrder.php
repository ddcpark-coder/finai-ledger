<?php

namespace App\Application\Integrations;

use App\Domain\Integrations\CommerceOrderContract;
use Illuminate\Support\Facades\DB;

final class StageSyntheticCommerceOrder
{
    public function execute(int $companyId,int $actorId,array $payload): array
    {
        // No public route, and fail closed even if called from a queued job.
        if(! app()->environment('local','testing')
            || ! config('finai.synthetic_commerce_staging_enabled',false))
            throw new \DomainException('Synthetic commerce inbox is disabled.');

        $order=CommerceOrderContract::normalize($payload,$companyId);
        return DB::transaction(function()use($companyId,$actorId,$order):array{
            CompanyWorkflowAccess::requirePermission($companyId,$actorId,'orders.write');
            $connection=DB::table('commerce_connections')
                ->where('company_id',$companyId)->where('code',$order['connection_code'])
                ->where('provider',$order['provider'])->where('status','draft')
                ->lockForUpdate()->first();
            if(! $connection)throw new \DomainException('Unknown or active commerce connection.');

            $warehouse=DB::table('warehouses')->where('id',$order['warehouse_id'])
                ->where('company_id',$companyId)->where('active',true)->first();
            if(! $warehouse)throw new \DomainException('Warehouse belongs to another company.');

            $mapped=[];
            foreach($order['lines'] as $line){
                $sku=DB::table('commerce_sku_mappings')
                    ->where('company_id',$companyId)
                    ->where('connection_id',$connection->id)
                    ->where('external_sku',$line['sku'])->value('internal_sku');
                if(! $sku)throw new \DomainException('Unmapped synthetic shop SKU.');
                $mapped[]=[
                    'internal_sku'=>$sku,'quantity'=>$line['quantity'],
                    'unit_price_cents'=>$line['unit_price_cents'],
                    'line_total_cents'=>$line['line_total_cents'],
                ];
            }
            // Never store customer identity, address, token, webhook or raw payload.
            $normalized=[
                'demo_only'=>true,'posting'=>false,'provider'=>$order['provider'],
                'warehouse_id'=>$order['warehouse_id'],
                'currency'=>'EUR','total_cents'=>$order['total_cents'],
                'lines'=>$mapped,'status'=>'review',
            ];
            $encoded=json_encode($normalized,JSON_THROW_ON_ERROR);
            $fingerprint=hash('sha256',$encoded);
            $prior=DB::table('commerce_order_events')
                ->where('connection_id',$connection->id)
                ->where('event_id',$order['event_id'])
                ->lockForUpdate()->first();
            if($prior){
                if($prior->fingerprint!==$fingerprint
                    ||$prior->external_order_id!==$order['external_order_id'])
                    throw new \DomainException('Commerce event replay contains different data.');
                return ['id'=>$prior->id,'demo_only'=>true,'replayed'=>true,
                    'status'=>'review'];
            }
            $sameOrder=DB::table('commerce_order_events')
                ->where('connection_id',$connection->id)
                ->where('external_order_id',$order['external_order_id'])->exists();
            if($sameOrder)throw new \DomainException('Commerce order already staged.');

            $id=DB::table('commerce_order_events')->insertGetId([
                'company_id'=>$companyId,'connection_id'=>$connection->id,
                'actor_user_id'=>$actorId,
                'event_id'=>$order['event_id'],
                'external_order_id'=>$order['external_order_id'],
                'fingerprint'=>$fingerprint,'normalized_json'=>$encoded,
                'status'=>'review','created_at'=>now(),'updated_at'=>now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id'=>$companyId,'actor_user_id'=>$actorId,
                'event_type'=>'synthetic_commerce_order.staged',
                'entity_type'=>'commerce_order_event','entity_id'=>(string)$id,
                'metadata'=>json_encode([
                    'demo_only'=>true,'connection_id'=>$connection->id,
                    'provider'=>$order['provider'],'external_order_id'=>$order['external_order_id'],
                    'fingerprint'=>$fingerprint,
                ],JSON_THROW_ON_ERROR),
                'created_at'=>now(),
            ]);
            return ['id'=>$id,'demo_only'=>true,'replayed'=>false,
                'status'=>'review'];
        },3);
    }
}
