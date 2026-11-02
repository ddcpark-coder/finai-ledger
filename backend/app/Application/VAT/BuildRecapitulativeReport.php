<?php

namespace App\Application\VAT;

use Illuminate\Support\Facades\DB;

final class BuildRecapitulativeReport
{
    public function execute(int $periodId): array
    {
        $period = DB::table('vat_periods')->find($periodId);
        if (! $period) {
            throw new \DomainException('VAT period not found.');
        }

        $rows = DB::table('vat_entries')
            ->where('vat_period_id', $periodId)
            ->where('direction', 'output')
            ->where('country_code', '<>', 'SI')
            ->whereNotNull('partner_vat_id')
            ->whereJsonContains('reporting_tags', 'eu_recap')
            ->selectRaw('partner_id, partner_vat_id, country_code, SUM(taxable_base) as amount')
            ->groupBy('partner_id', 'partner_vat_id', 'country_code')
            ->get();

        DB::table('vat_recap_lines')->where('vat_period_id', $periodId)->delete();

        foreach ($rows as $row) {
            if ((float) $row->amount < 0) {
                throw new \DomainException('Negative values must be handled as corrections, not current-period recap amounts.');
            }

            DB::table('vat_recap_lines')->insert([
                'vat_period_id' => $periodId,
                'partner_id' => $row->partner_id,
                'partner_vat_id' => $row->partner_vat_id,
                'country_code' => $row->country_code,
                'transaction_type' => 'eu_supply',
                'amount' => $row->amount,
                'correction' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return DB::table('vat_recap_lines')->where('vat_period_id', $periodId)->get()->map(fn($x)=>(array)$x)->all();
    }
}
