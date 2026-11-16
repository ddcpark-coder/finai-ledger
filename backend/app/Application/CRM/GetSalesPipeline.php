<?php

namespace App\Application\CRM;

use Illuminate\Support\Facades\DB;

final class GetSalesPipeline
{
    public function execute(int $companyId, int $actorId,
        ?int $ownerUserId = null, ?int $businessUnitId = null): array
    {
        CrmReferenceGuard::permission($companyId, $actorId, 'read');

        $query = DB::table('crm_opportunities as opportunity')
            ->where('opportunity.company_id', $companyId)
            ->whereNotIn('opportunity.stage', ['won', 'lost']);

        if ($ownerUserId !== null) {
            // A company-scoped filter, not permission to read another company's CRM.
            $query->where('opportunity.owner_user_id', $ownerUserId);
        }
        if ($businessUnitId !== null) {
            CrmReferenceGuard::activeUnit($companyId, $businessUnitId);
            $query->join('crm_opportunity_business_units as assignment',
                'assignment.opportunity_id', '=', 'opportunity.id')
                ->where('assignment.company_id', $companyId)
                ->where('assignment.business_unit_id', $businessUnitId);
        }
        // Values remain decimal string estimates, never accounting journal totals.
        $rows = $query
            ->select('opportunity.stage')
            ->selectRaw('COUNT(*) as opportunity_count')
            ->selectRaw('SUM(opportunity.value) as pipeline_value')
            ->selectRaw('SUM(opportunity.value * opportunity.probability_percent / 100) as weighted_value')
            ->groupBy('opportunity.stage')->get();

        return $rows->map(fn ($row) => [
            'stage' => $row->stage,
            'opportunity_count' => (int) $row->opportunity_count,
            'pipeline_value' => (string) ($row->pipeline_value ?? 0),
            'weighted_value' => (string) ($row->weighted_value ?? 0),
        ])->all();
    }
}
