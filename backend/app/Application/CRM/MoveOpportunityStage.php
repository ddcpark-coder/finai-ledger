<?php

namespace App\Application\CRM;

use App\Domain\CRM\OpportunityStage;
use Illuminate\Support\Facades\DB;

final class MoveOpportunityStage
{
    public function execute(int $companyId, int $opportunityId, string $stage,
        int $actorId, ?int $businessUnitId = null): void
    {
        // Validate the stage without introducing any public CRM posting route.
        $target = OpportunityStage::from($stage);

        DB::transaction(function () use ($companyId, $opportunityId,
            $target, $actorId, $businessUnitId): void {
            CrmReferenceGuard::permission($companyId, $actorId, 'write');
            $opportunity = DB::table('crm_opportunities')
                ->where('id', $opportunityId)
                ->where('company_id', $companyId)
                ->lockForUpdate()->first();

            if (! $opportunity) {
                throw new \DomainException('CRM opportunity not found in company.');
            }
            if ($businessUnitId !== null) {
                CrmReferenceGuard::linkedUnit($companyId,
                    $opportunityId, $businessUnitId);
            }
            $transitions = [
                'qualification' => 'discovery',
                'discovery' => 'proposal',
                'proposal' => 'negotiation',
                'negotiation' => 'won',
            ];
            // Lost is a terminal outcome from any open stage.
            $allowed = ! in_array($opportunity->stage, ['won', 'lost'], true)
                && ($target->value === 'lost'
                    || ($transitions[$opportunity->stage] ?? null) === $target->value);
            if (! $allowed) {
                throw new \DomainException('Illegal, duplicate or closed CRM stage transition.');
            }

            $changed = DB::table('crm_opportunities')
                ->where('id', $opportunityId)
                ->where('company_id', $companyId)
                ->where('stage', $opportunity->stage)
                ->update([
                    'stage' => $target->value,
                    'probability_percent' => $target->defaultProbability(),
                    'updated_at' => now(),
                ]);
            if ($changed !== 1) {
                throw new \DomainException('Concurrent CRM stage transition rejected.');
            }

            DB::table('audit_logs')->insert([
                'company_id' => $companyId,
                'actor_user_id' => $actorId,
                'event_type' => 'crm.opportunity_stage_changed',
                'entity_type' => 'crm_opportunity',
                'entity_id' => (string) $opportunityId,
                'metadata' => json_encode([
                    'from' => $opportunity->stage,
                    'to' => $target->value,
                    'business_unit_id' => $businessUnitId,
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
        }, 3);
    }
}
