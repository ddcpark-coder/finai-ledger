<?php

namespace App\Application\Accounting;

use Illuminate\Support\Facades\DB;

final class LockAccountingPeriod
{
    public function execute(int $periodId, int $userId): void
    {
        DB::transaction(function () use ($periodId, $userId) {
            $period = DB::table('accounting_periods')->lockForUpdate()->find($periodId);
            if (! $period || $period->status !== 'open') {
                throw new \DomainException('Only an open period can be locked.');
            }

            $drafts = DB::table('journals')
                ->where('accounting_period_id', $periodId)
                ->where('status', 'draft')
                ->count();

            if ($drafts > 0) {
                throw new \DomainException('Period contains draft journals.');
            }

            DB::table('accounting_periods')->where('id', $periodId)->update([
                'status' => 'locked',
                'locked_at' => now(),
                'locked_by' => $userId,
                'updated_at' => now(),
            ]);

            $year = DB::table('fiscal_years')->find($period->fiscal_year_id);
            DB::table('audit_logs')->insert([
                'company_id' => $year?->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'accounting_period.locked',
                'entity_type' => 'accounting_period',
                'entity_id' => (string) $periodId,
                'metadata' => json_encode(['period_no' => $period->period_no]),
                'created_at' => now(),
            ]);
        });
    }
}
