<?php

namespace App\Application\Partners;

use Illuminate\Support\Facades\DB;

final class GetPartnerBalance
{
    public function execute(int $companyId, int $partnerId): array
    {
        $rows = DB::table('open_items')
            ->where('company_id', $companyId)
            ->where('partner_id', $partnerId)
            ->whereIn('status', ['open', 'partial'])
            ->selectRaw('currency, SUM(open_amount) as open_amount, SUM(CASE WHEN due_date < CURRENT_DATE THEN open_amount ELSE 0 END) as overdue_amount')
            ->groupBy('currency')
            ->get();

        return $rows->map(fn ($row) => [
            'currency' => $row->currency,
            'open_amount' => (string) $row->open_amount,
            'overdue_amount' => (string) $row->overdue_amount,
        ])->all();
    }
}
