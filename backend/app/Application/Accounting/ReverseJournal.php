<?php

namespace App\Application\Accounting;

use Illuminate\Support\Facades\DB;

final class ReverseJournal
{
    public function execute(int $journalId, int $userId, string $reversalNumber): int
    {
        return DB::transaction(function () use ($journalId, $userId, $reversalNumber) {
            $original = DB::table('journals')->lockForUpdate()->find($journalId);
            if (! $original || $original->status !== 'posted') {
                throw new \DomainException('Only posted journals can be reversed.');
            }

            $period = DB::table('accounting_periods')->find($original->accounting_period_id);
            if (! $period || $period->status !== 'open') {
                throw new \DomainException('Reversal must be posted into an open accounting period.');
            }

            $reversalId = DB::table('journals')->insertGetId([
                'company_id' => $original->company_id,
                'fiscal_year_id' => $original->fiscal_year_id,
                'accounting_period_id' => $original->accounting_period_id,
                'number' => $reversalNumber,
                'posting_date' => now()->toDateString(),
                'document_date' => $original->document_date,
                'document_ref' => $original->document_ref,
                'description' => 'STORNO: '.$original->description,
                'status' => 'posted',
                'reversal_of_id' => $original->id,
                'created_by' => $userId,
                'posted_by' => $userId,
                'posted_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $lines = DB::table('journal_entries')->where('journal_id', $journalId)->orderBy('line_no')->get();
            foreach ($lines as $line) {
                DB::table('journal_entries')->insert([
                    'journal_id' => $reversalId,
                    'line_no' => $line->line_no,
                    'account_id' => $line->account_id,
                    'cost_center_id' => $line->cost_center_id,
                    'tax_code_id' => $line->tax_code_id,
                    'counterparty_ref' => $line->counterparty_ref,
                    'open_item_ref' => $line->open_item_ref,
                    'description' => $line->description,
                    'debit' => $line->credit,
                    'credit' => $line->debit,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('journals')->where('id', $journalId)->update([
                'status' => 'reversed',
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $original->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'journal.reversed',
                'entity_type' => 'journal',
                'entity_id' => (string) $journalId,
                'metadata' => json_encode(['reversal_journal_id' => $reversalId]),
                'created_at' => now(),
            ]);

            return $reversalId;
        });
    }
}
