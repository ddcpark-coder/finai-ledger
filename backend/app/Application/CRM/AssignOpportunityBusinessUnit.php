<?php

namespace App\Application\CRM;

use Illuminate\Support\Facades\DB;

final class AssignOpportunityBusinessUnit
{
    public function execute(int $companyId, int $actorId, int $opportunityId,
        int $businessUnitId): bool
    {
        return DB::transaction(function () use ($companyId, $actorId,
            $opportunityId, $businessUnitId): bool {
            CrmReferenceGuard::permission($companyId, $actorId, 'write');
            CrmReferenceGuard::activeUnit($companyId, $businessUnitId);
            $opportunity = DB::table('crm_opportunities')
                ->where('id', $opportunityId)->where('company_id', $companyId)
                ->lockForUpdate()->first();
            if (! $opportunity) {
                throw new \DomainException('CRM opportunity not found in company.');
            }
            $old = DB::table('crm_opportunity_business_units')
                ->where('opportunity_id', $opportunityId)
                ->lockForUpdate()->first();
            if ($old) {
                if ((int) $old->company_id !== $companyId
                    || (int) $old->business_unit_id !== $businessUnitId) {
                    throw new \DomainException('CRM opportunity is assigned to another unit.');
                }
                return false; // Identical replay: no audit duplicate.
            }
            $id = DB::table('crm_opportunity_business_units')->insertGetId([
                'company_id' => $companyId,
                'opportunity_id' => $opportunityId,
                'business_unit_id' => $businessUnitId,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id' => $companyId, 'actor_user_id' => $actorId,
                'event_type' => 'crm.opportunity_unit_assigned',
                'entity_type' => 'crm_opportunity',
                'entity_id' => (string) $opportunityId,
                'metadata' => json_encode(['unit_id' => $businessUnitId,
                    'link_id' => $id], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            return true;
        }, 3);
    }
}
