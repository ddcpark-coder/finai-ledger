<?php

namespace App\Application\CRM;

use Illuminate\Support\Facades\DB;

final class ConvertLeadToOpportunity
{
    public function execute(int $leadId, int $userId): int
    {
        return DB::transaction(function () use ($leadId, $userId) {
            $lead = DB::table('crm_leads')->lockForUpdate()->find($leadId);

            if (! $lead || in_array($lead->status, ['converted', 'disqualified'], true)) {
                throw new \DomainException('Lead cannot be converted.');
            }

            $opportunityId = DB::table('crm_opportunities')->insertGetId([
                'company_id' => $lead->company_id,
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

            DB::table('crm_leads')->where('id', $leadId)->update([
                'status' => 'converted',
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $lead->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'crm.lead_converted',
                'entity_type' => 'crm_lead',
                'entity_id' => (string) $leadId,
                'metadata' => json_encode(['opportunity_id' => $opportunityId]),
                'created_at' => now(),
            ]);

            return $opportunityId;
        });
    }
}
