<?php

namespace App\Application\Accounting;

use App\Domain\Accounting\BalanceCalculator;
use Illuminate\Support\Facades\DB;

final class ReverseJournal
{
    public function execute(int $journalId, int $userId, string $reversalNumber,
        string $postingDate): int
    {
        $reversalNumber = trim($reversalNumber);
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $postingDate);
        if ($reversalNumber === '' || mb_strlen($reversalNumber) > 50
            || ! $date || $date->format('Y-m-d') !== $postingDate) {
            throw new \InvalidArgumentException('Invalid reversal number or date.');
        }
        return DB::transaction(function () use ($journalId, $userId,
            $reversalNumber, $postingDate): int {
            $original = DB::table('journals')->lockForUpdate()->find($journalId);
            if (! $original || $original->status !== 'posted'
                || $original->reversal_of_id !== null) {
                throw new \DomainException('Only an original posted journal can be reversed.');
            }

            LedgerPostingGuard::requireWriter((int) $original->company_id, $userId);
            $period = LedgerPostingGuard::openPeriod(
                (int) $original->company_id, (int) $original->fiscal_year_id,
                (int) $original->accounting_period_id
            );
            if ($postingDate < $period->starts_on || $postingDate > $period->ends_on) {
                throw new \DomainException('Reversal posting date is outside the open accounting period.');
            }
            if (DB::table('journals')->where('company_id', $original->company_id)
                ->where('number', $reversalNumber)->exists()) {
                throw new \DomainException('Reversal number already exists in this company.');
            }

            $lines = LedgerPostingGuard::journalEntries(
                (int) $original->company_id, $journalId
            );
            // The reversal must balance before any write, even if its source was edited.
            BalanceCalculator::assertBalanced(array_map(static fn ($line) => [
                'debit' => $line->credit, 'credit' => $line->debit,
            ], $lines));

            $reversalId = DB::table('journals')->insertGetId([
                'company_id' => $original->company_id,
                'fiscal_year_id' => $original->fiscal_year_id,
                'accounting_period_id' => $original->accounting_period_id,
                'number' => $reversalNumber,
                'posting_date' => $postingDate,
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

            $changed = DB::table('journals')->where('id', $journalId)
                ->where('company_id', $original->company_id)
                ->where('status', 'posted')->update([
                    'status' => 'reversed', 'updated_at' => now(),
                ]);
            if ($changed !== 1) {
                throw new \DomainException('Original journal was already changed.');
            }

            DB::table('audit_logs')->insert([
                'company_id' => $original->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'journal.reversed',
                'entity_type' => 'journal',
                'entity_id' => (string) $journalId,
                'metadata' => json_encode([
                    'reversal_journal_id' => $reversalId,
                    'number' => $reversalNumber,
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
            return $reversalId;
        }, 3);
    }
}
