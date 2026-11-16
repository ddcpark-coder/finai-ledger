<?php

namespace App\Application\CRM;

use Illuminate\Support\Facades\DB;

final class ConvertLeadToOpportunity
{
    public function execute(int $companyId, int $leadId, int $actorId,
        ?int $businessUnitId = null): int
    {
        return DB::transaction(function () use ($companyId, $leadId, $actorId,
            $businessUnitId): int {
            CrmReferenceGuard::permission($companyId, $actorId, 'write');
            $lead = DB::table('crm_leads')->where('id', $leadId)
                ->where('company_id', $companyId)->lockForUpdate()->first();
            if (! $lead || in_array($lead->status, ['converted', 'disqualified'], true)) {
                throw new \DomainException('Lead cannot be converted in this company.');
            }
            CrmReferenceGuard::leadReferences($companyId, $lead);
            if ($businessUnitId !== null) {
                CrmReferenceGuard::activeUnit($companyId, $businessUnitId);
            }

            $opportunityId = DB::table('crm_opportunities')->insertGetId([
                'company_id' => $companyId,
                'lead_id' => $lead->id,
                'partner_id' => $lead->partner_id,
                'contact_id' => $lead->contact_id,
                'owner_user_id' => $lead->owner_user_id,
                'name' => $lead->name,
                'stage' => 'qualification',
                'probability_percent' => 10,
                'value' => $lead->estimated_value ?? 0,
                'currency' => $lead->currency,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            if ($businessUnitId !== null) {
                DB::table('crm_opportunity_business_units')->insert([
                    'company_id' => $companyId,
                    'opportunity_id' => $opportunityId,
                    'business_unit_id' => $businessUnitId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            $changed = DB::table('crm_leads')->where('id', $leadId)
                ->where('company_id', $companyId)->where('status', $lead->status)
                ->update(['status' => 'converted', 'updated_at' => now()]);
            if ($changed !== 1) {
                throw new \DomainException('Concurrent lead conversion rejected.');
            }
            DB::table('audit_logs')->insert([
                'company_id' => $companyId,
                'actor_user_id' => $actorId,
                'event_type' => 'crm.lead_converted',
                'entity_type' => 'crm_lead',
                'entity_id' => (string) $leadId,
                'metadata' => json_encode([
                    'opportunity_id' => $opportunityId,
                    'business_unit_id' => $businessUnitId,
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            return $opportunityId;
        }, 3);
    }
}
