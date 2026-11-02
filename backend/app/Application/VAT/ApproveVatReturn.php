<?php

namespace App\Application\VAT;

use Illuminate\Support\Facades\DB;

final class ApproveVatReturn
{
    public function execute(int $returnId, int $userId): void
    {
        DB::transaction(function () use ($returnId, $userId) {
            $return = DB::table('vat_returns')->lockForUpdate()->find($returnId);
            if (! $return || $return->status !== 'draft') {
                throw new \DomainException('Only draft VAT returns can be approved.');
            }

            $openErrors = DB::table('vat_control_results')
                ->where('vat_period_id', $return->vat_period_id)
                ->where('status', 'open')
                ->where('severity', 'error')
                ->count();

            if ($openErrors > 0) {
                throw new \DomainException('VAT return has unresolved control errors.');
            }

            DB::table('vat_returns')->where('id', $returnId)->update([
                'status' => 'approved',
                'approved_by' => $userId,
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $return->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'vat_return.approved',
                'entity_type' => 'vat_return',
                'entity_id' => (string) $returnId,
                'metadata' => json_encode(['vat_period_id' => $return->vat_period_id]),
                'created_at' => now(),
            ]);
        });
    }
}
