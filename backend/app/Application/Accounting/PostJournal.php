<?php

namespace App\Application\Accounting;

use App\Domain\Accounting\BalanceCalculator;
use Illuminate\Support\Facades\DB;

final class PostJournal
{
    public function execute(int $journalId, int $userId): void
    {
        DB::transaction(function () use ($journalId, $userId) {
            $journal = DB::table('journals')->lockForUpdate()->find($journalId);
            if (! $journal || $journal->status !== 'draft') {
                throw new \DomainException('Only draft journals can be posted.');
            }

            $period = DB::table('accounting_periods')->lockForUpdate()->find($journal->accounting_period_id);
            if (! $period || $period->status !== 'open') {
                throw new \DomainException('Accounting period is locked.');
            }

            if ($journal->posting_date < $period->starts_on || $journal->posting_date > $period->ends_on) {
                throw new \DomainException('Posting date is outside the selected accounting period.');
            }

            $entries = DB::table('journal_entries')
                ->where('journal_id', $journalId)
                ->orderBy('line_no')
                ->get()
                ->map(fn ($line) => ['debit' => $line->debit, 'credit' => $line->credit])
                ->all();

            BalanceCalculator::assertBalanced($entries);

            $invalidAccount = DB::table('journal_entries as e')
                ->join('accounts as a', 'a.id', '=', 'e.account_id')
                ->where('e.journal_id', $journalId)
                ->where(function ($q) use ($journal) {
                    $q->where('a.company_id', '<>', $journal->company_id)
                      ->orWhere('a.active', false)
                      ->orWhere('a.postable', false);
                })
                ->exists();

            if ($invalidAccount) {
                throw new \DomainException('Journal contains an invalid or non-postable account.');
            }

            DB::table('journals')->where('id', $journalId)->update([
                'status' => 'posted',
                'posted_by' => $userId,
                'posted_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $journal->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'journal.posted',
                'entity_type' => 'journal',
                'entity_id' => (string) $journalId,
                'metadata' => json_encode(['number' => $journal->number]),
                'created_at' => now(),
            ]);
        });
    }
}
