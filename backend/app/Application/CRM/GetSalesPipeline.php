<?php

namespace App\Application\CRM;

use Illuminate\Support\Facades\DB;

final class GetSalesPipeline
{
    public function execute(int $companyId, ?int $ownerUserId = null): array
    {
        $query = DB::table('crm_opportunities')
            ->where('company_id', $companyId)
            ->whereNotIn('stage', ['won', 'lost']);

        if ($ownerUserId) {
            $query->where('owner_user_id', $ownerUserId);
        }

        $rows = $query
            ->select('stage')
            ->selectRaw('COUNT(*) as opportunity_count')
            ->selectRaw('SUM(value) as pipeline_value')
            ->selectRaw('SUM(value * probability_percent / 100) as weighted_value')
            ->groupBy('stage')
            ->get();

        return $rows->map(fn ($row) => [
            'stage' => $row->stage,
            'opportunity_count' => (int) $row->opportunity_count,
            'pipeline_value' => (string) ($row->pipeline_value ?? 0),
            'weighted_value' => (string) ($row->weighted_value ?? 0),
        ])->all();
    }
}
