<?php

namespace App\Application\CRM;

use Illuminate\Support\Facades\DB;

final class GetNextActions
{
    public function execute(int $companyId, int $userId, int $limit = 25): array
    {
        $limit = max(1, min(100, $limit));

        return DB::table('crm_activities')
            ->where('company_id', $companyId)
            ->where('assigned_to', $userId)
            ->where('status', 'open')
            ->whereNotNull('due_at')
            ->orderBy('due_at')
            ->limit($limit)
            ->get([
                'id', 'type', 'subject', 'partner_id', 'lead_id',
                'opportunity_id', 'due_at', 'status'
            ])
            ->map(fn ($row) => (array) $row)
            ->all();
    }
}
