<?php

namespace App\Application\VAT;

use App\Domain\VAT\VatMath;
use Illuminate\Support\Facades\DB;

final class BuildVatReturn
{
    public function execute(int $periodId, int $userId): int
    {
        return DB::transaction(function () use ($periodId, $userId) {
            $period = DB::table('vat_periods')->lockForUpdate()->find($periodId);
            if (! $period) {
                throw new \DomainException('VAT period not found.');
            }

            $entries = DB::table('vat_entries')
                ->where('vat_period_id', $periodId)
                ->get();

            $fields = [
                'output_tax_base' => (string) $entries->where('direction', 'output')->sum('taxable_base'),
                'output_tax' => (string) $entries->where('direction', 'output')->sum('tax_amount'),
                'input_tax_base' => (string) $entries->where('direction', 'input')->sum('taxable_base'),
                'input_tax' => (string) $entries->where('direction', 'input')->sum('tax_amount'),
                'deductible_input_tax' => (string) $entries->where('direction', 'input')->sum('deductible_tax_amount'),
            ];

            $fields['vat_payable'] = VatMath::fromCents(
                VatMath::toCents($fields['output_tax']) - VatMath::toCents($fields['deductible_input_tax'])
            );

            $version = ((int) DB::table('vat_returns')
                ->where('vat_period_id', $periodId)
                ->where('return_type', 'DDV-O')
                ->max('version')) + 1;

            $returnId = DB::table('vat_returns')->insertGetId([
                'company_id' => $period->company_id,
                'vat_period_id' => $periodId,
                'return_type' => 'DDV-O',
                'version' => $version,
                'status' => 'draft',
                'calculated_fields' => json_encode($fields),
                'prepared_by' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $period->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'vat_return.prepared',
                'entity_type' => 'vat_return',
                'entity_id' => (string) $returnId,
                'metadata' => json_encode(['period_id' => $periodId, 'version' => $version]),
                'created_at' => now(),
            ]);

            return $returnId;
        });
    }
}
