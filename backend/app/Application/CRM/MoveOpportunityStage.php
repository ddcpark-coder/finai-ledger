<?php

namespace App\Application\CRM;

use App\Domain\CRM\OpportunityStage;
use Illuminate\Support\Facades\DB;

final class MoveOpportunityStage
{
    public function execute(int $opportunityId, string $stage, int $userId): void
    {
        $target = OpportunityStage::from($stage);

        DB::transaction(function () use ($opportunityId, $target, $userId) {
            $opportunity = DB::table('crm_opportunities')->lockForUpdate()->find($opportunityId);

            if (! $opportunity) {
                throw new \DomainException('Opportunity not found.');
            }

            if (in_array($opportunity->stage, ['won', 'lost'], true)) {
                throw new \DomainException('Closed opportunity cannot be moved without explicit reopen workflow.');
            }

            DB::table('crm_opportunities')->where('id', $opportunityId)->update([
                'stage' => $target->value,
                'probability_percent' => $target->defaultProbability(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $opportunity->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'crm.opportunity_stage_changed',
                'entity_type' => 'crm_opportunity',
                'entity_id' => (string) $opportunityId,
                'metadata' => json_encode([
                    'from' => $opportunity->stage,
                    'to' => $target->value,
                ]),
                'created_at' => now(),
            ]);
        });
    }
}
