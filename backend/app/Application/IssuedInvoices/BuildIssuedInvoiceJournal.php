<?php

namespace App\Application\IssuedInvoices;

use App\Domain\Accounting\BalanceCalculator;
use Illuminate\Support\Facades\DB;

final class BuildIssuedInvoiceJournal
{
    public function execute(int $invoiceId, int $userId, int $receivableAccountId): int
    {
        return DB::transaction(function () use ($invoiceId, $userId, $receivableAccountId) {
            $invoice = DB::table('issued_invoices')->lockForUpdate()->find($invoiceId);
            if (! $invoice || ! in_array($invoice->status, ['issued', 'sent', 'partially_paid', 'paid'], true)) {
                throw new \DomainException('Invoice must be issued before posting.');
            }

            if ($invoice->journal_id) {
                return (int) $invoice->journal_id;
            }

            $receivableAccount = DB::table('accounts')
                ->where('id', $receivableAccountId)
                ->where('company_id', $invoice->company_id)
                ->where('active', true)
                ->where('postable', true)
                ->first();

            if (! $receivableAccount) {
                throw new \DomainException('Invalid receivable account.');
            }

            $period = DB::table('accounting_periods as p')
                ->join('fiscal_years as y', 'y.id', '=', 'p.fiscal_year_id')
                ->where('y.company_id', $invoice->company_id)
                ->where('p.status', 'open')
                ->whereDate('p.starts_on', '<=', $invoice->issue_date)
                ->whereDate('p.ends_on', '>=', $invoice->issue_date)
                ->select('p.*', 'y.id as fiscal_year_id')
                ->first();

            if (! $period) {
                throw new \DomainException('No open accounting period for invoice date.');
            }

            $journalId = DB::table('journals')->insertGetId([
                'company_id' => $invoice->company_id,
                'fiscal_year_id' => $period->fiscal_year_id,
                'accounting_period_id' => $period->id,
                'number' => 'AR-'.$invoice->number,
                'posting_date' => $invoice->issue_date,
                'document_date' => $invoice->issue_date,
                'document_ref' => $invoice->number,
                'description' => 'Izdani račun '.$invoice->number,
                'status' => 'draft',
                'created_by' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $entries = [[
                'journal_id' => $journalId,
                'line_no' => 1,
                'account_id' => $receivableAccountId,
                'partner_id' => $invoice->partner_id,
                'description' => 'Terjatev '.$invoice->number,
                'debit' => $invoice->gross_amount,
                'credit' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]];

            $lineNo = 2;
            foreach (DB::table('issued_invoice_lines')->where('issued_invoice_id', $invoiceId)->get() as $line) {
                if (! $line->revenue_account_id) {
                    throw new \DomainException('Revenue account missing on invoice line.');
                }

                $revenueAccount = DB::table('accounts')
                    ->where('id', $line->revenue_account_id)
                    ->where('company_id', $invoice->company_id)
                    ->where('active', true)
                    ->where('postable', true)
                    ->first();

                if (! $revenueAccount) {
                    throw new \DomainException('Invalid revenue account on invoice line.');
                }

                $entries[] = [
                    'journal_id' => $journalId,
                    'line_no' => $lineNo++,
                    'account_id' => $line->revenue_account_id,
                    'partner_id' => $invoice->partner_id,
                    'cost_center_id' => $line->cost_center_id,
                    'tax_code_id' => $line->tax_code_id,
                    'description' => $line->description,
                    'debit' => 0,
                    'credit' => $line->net_amount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if ((float) $invoice->tax_amount > 0) {
                $taxAccountId = DB::table('accounts')
                    ->where('company_id', $invoice->company_id)
                    ->where('code', '2600')
                    ->where('active', true)
                    ->where('postable', true)
                    ->value('id');

                if (! $taxAccountId) {
                    throw new \DomainException('Output VAT account is not configured.');
                }

                $entries[] = [
                    'journal_id' => $journalId,
                    'line_no' => $lineNo,
                    'account_id' => $taxAccountId,
                    'partner_id' => $invoice->partner_id,
                    'description' => 'Izhodni DDV '.$invoice->number,
                    'debit' => 0,
                    'credit' => $invoice->tax_amount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            BalanceCalculator::assertBalanced($entries);

            DB::table('journal_entries')->insert($entries);

            $entryId = DB::table('journal_entries')
                ->where('journal_id', $journalId)
                ->where('line_no', 1)
                ->value('id');

            DB::table('open_items')->insert([
                'company_id' => $invoice->company_id,
                'partner_id' => $invoice->partner_id,
                'account_id' => $receivableAccountId,
                'source_journal_entry_id' => $entryId,
                'counterparty_ref' => (string) $invoice->partner_id,
                'reference' => $invoice->number,
                'due_date' => $invoice->due_date,
                'original_amount' => $invoice->gross_amount,
                'open_amount' => $invoice->gross_amount,
                'currency' => $invoice->currency,
                'status' => 'open',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('issued_invoices')->where('id', $invoiceId)->update([
                'journal_id' => $journalId,
                'updated_at' => now(),
            ]);

            return $journalId;
        });
    }
}
