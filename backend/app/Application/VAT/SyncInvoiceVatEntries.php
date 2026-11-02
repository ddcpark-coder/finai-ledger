<?php

namespace App\Application\VAT;

use Illuminate\Support\Facades\DB;

final class SyncInvoiceVatEntries
{
    public function execute(string $sourceType, int $sourceId, int $vatPeriodId): void
    {
        if (! in_array($sourceType, ['incoming_invoice', 'issued_invoice'], true)) {
            throw new \DomainException('Unsupported VAT invoice source.');
        }

        DB::transaction(function () use ($sourceType, $sourceId, $vatPeriodId) {
            $period = DB::table('vat_periods')->lockForUpdate()->find($vatPeriodId);
            if (! $period || $period->status !== 'open') {
                throw new \DomainException('VAT period is not open.');
            }

            $isIncoming = $sourceType === 'incoming_invoice';
            $headerTable = $isIncoming ? 'incoming_invoices' : 'issued_invoices';
            $lineTable = $isIncoming ? 'incoming_invoice_lines' : 'issued_invoice_lines';
            $fk = $isIncoming ? 'incoming_invoice_id' : 'issued_invoice_id';

            $invoice = DB::table($headerTable)->find($sourceId);
            if (! $invoice || $invoice->company_id !== $period->company_id) {
                throw new \DomainException('Invoice does not belong to VAT period company.');
            }

            if (! $invoice->partner_id) {
                throw new \DomainException('Partner is required for VAT evidence.');
            }

            $partner = DB::table('partners')->find($invoice->partner_id);
            $lines = DB::table($lineTable)->where($fk, $sourceId)->orderBy('line_no')->get();

            if ($lines->isEmpty()) {
                throw new \DomainException('Invoice has no lines for VAT evidence.');
            }

            DB::table('vat_entries')
                ->where('company_id', $period->company_id)
                ->where('source_type', $sourceType)
                ->where('source_id', $sourceId)
                ->delete();

            foreach ($lines as $line) {
                if (! $line->tax_code_id) {
                    throw new \DomainException('Invoice line has no VAT tax code.');
                }

                $taxCode = DB::table('tax_codes')
                    ->where('id', $line->tax_code_id)
                    ->where('company_id', $period->company_id)
                    ->where('active', true)
                    ->first();

                if (! $taxCode) {
                    throw new \DomainException('Invalid VAT tax code.');
                }

                $tags = json_decode($taxCode->metadata ?? '{}', true)['reporting_tags'] ?? [];

                DB::table('vat_entries')->insert([
                    'company_id' => $period->company_id,
                    'vat_period_id' => $vatPeriodId,
                    'partner_id' => $invoice->partner_id,
                    'tax_code_id' => $line->tax_code_id,
                    'source_type' => $sourceType,
                    'source_id' => $sourceId,
                    'document_date' => $invoice->issue_date,
                    'document_number' => $isIncoming ? $invoice->invoice_number : $invoice->number,
                    'direction' => $isIncoming ? 'input' : 'output',
                    'taxable_base' => $line->net_amount,
                    'tax_amount' => $line->tax_amount,
                    'deductible_tax_amount' => $isIncoming ? $line->tax_amount : 0,
                    'country_code' => $partner?->country_code ?? 'SI',
                    'partner_vat_id' => $partner?->vat_id,
                    'reporting_tags' => json_encode($tags),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });
    }
}
