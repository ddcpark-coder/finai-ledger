<?php

namespace App\Application\IssuedInvoices;

use Illuminate\Support\Facades\DB;

final class AllocateInvoiceNumber
{
    public function execute(int $companyId, string $sequenceKey, int $year): string
    {
        return DB::transaction(function () use ($companyId, $sequenceKey, $year) {
            $sequence = DB::table('invoice_sequences')
                ->where('company_id', $companyId)
                ->where('key', $sequenceKey)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if (! $sequence) {
                throw new \DomainException('Invoice numbering sequence not configured.');
            }

            $number = $sequence->next_number;

            DB::table('invoice_sequences')->where('id', $sequence->id)->update([
                'next_number' => $number + 1,
                'updated_at' => now(),
            ]);

            return ($sequence->prefix ?? '').str_pad((string) $number, $sequence->padding, '0', STR_PAD_LEFT);
        });
    }
}
