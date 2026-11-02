<?php

namespace App\Application\VAT;

use Illuminate\Support\Facades\DB;

final class RunVatControls
{
    public function execute(int $periodId): array
    {
        $period = DB::table('vat_periods')->find($periodId);
        if (! $period) {
            throw new \DomainException('VAT period not found.');
        }

        DB::table('vat_control_results')
            ->where('vat_period_id', $periodId)
            ->where('status', 'open')
            ->delete();

        $results = [];

        $missingVatIds = DB::table('vat_entries')
            ->where('vat_period_id', $periodId)
            ->where('country_code', '<>', 'SI')
            ->whereNull('partner_vat_id')
            ->count();

        if ($missingVatIds > 0) {
            $results[] = [
                'rule_key' => 'foreign_partner_missing_vat_id',
                'severity' => 'warning',
                'title' => 'Manjkajoči VAT ID pri tujih transakcijah',
                'message' => 'Nekatere tuje transakcije nimajo VAT ID partnerja.',
                'evidence' => ['count' => $missingVatIds],
            ];
        }

        $negativeRecaps = DB::table('vat_recap_lines')
            ->where('vat_period_id', $periodId)
            ->where('amount', '<', 0)
            ->count();

        if ($negativeRecaps > 0) {
            $results[] = [
                'rule_key' => 'recap_negative_amount',
                'severity' => 'error',
                'title' => 'Negativen znesek v rekapitulacijskem poročilu',
                'message' => 'Rekapitulacijsko poročilo vsebuje negativne zneske, ki zahtevajo popravek logike poročanja.',
                'evidence' => ['count' => $negativeRecaps],
            ];
        }

        $unmappedTaxCodes = DB::table('vat_entries as e')
            ->join('tax_codes as t', 't.id', '=', 'e.tax_code_id')
            ->where('e.vat_period_id', $periodId)
            ->whereNull('t.metadata')
            ->count();

        if ($unmappedTaxCodes > 0) {
            $results[] = [
                'rule_key' => 'tax_code_reporting_mapping_missing',
                'severity' => 'warning',
                'title' => 'DDV oznaka brez poročevalnega mappinga',
                'message' => 'Nekatere DDV oznake nimajo konfiguriranega mappinga na poročevalska polja.',
                'evidence' => ['count' => $unmappedTaxCodes],
            ];
        }

        foreach ($results as $result) {
            DB::table('vat_control_results')->insert([
                'vat_period_id' => $periodId,
                'rule_key' => $result['rule_key'],
                'severity' => $result['severity'],
                'status' => 'open',
                'title' => $result['title'],
                'message' => $result['message'],
                'evidence_json' => json_encode($result['evidence']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $results;
    }
}
