<?php

namespace App\Application\Accounting;

use Illuminate\Support\Facades\DB;

final class PostJournal
{
    public function execute(int $journalId, int $userId): void
    {
        DB::transaction(function () use ($journalId, $userId): void {
            $journal = DB::table('journals')->lockForUpdate()->find($journalId);
            if (! $journal || $journal->status !== 'draft') {
                throw new \DomainException('Only draft journals can be posted.');
            }
            LedgerPostingGuard::requireWriter((int) $journal->company_id, $userId);
            $period = LedgerPostingGuard::openPeriod(
                (int) $journal->company_id, (int) $journal->fiscal_year_id,
                (int) $journal->accounting_period_id
            );
            if ($journal->posting_date < $period->starts_on
                || $journal->posting_date > $period->ends_on) {
                throw new \DomainException('Posting date is outside the selected accounting period.');
            }

            LedgerPostingGuard::journalEntries((int) $journal->company_id, $journalId);
            $changed = DB::table('journals')->where('id', $journalId)
                ->where('company_id', $journal->company_id)
                ->where('status', 'draft')->update([
                    'status' => 'posted', 'posted_by' => $userId,
                    'posted_at' => now(), 'updated_at' => now(),
                ]);
            if ($changed !== 1) {
                throw new \DomainException('Concurrent journal posting was rejected.');
            }

            DB::table('audit_logs')->insert([
                'company_id' => $journal->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'journal.posted',
                'entity_type' => 'journal',
                'entity_id' => (string) $journalId,
                'metadata' => json_encode([
                    'number' => $journal->number,
                    'period_id' => (int) $journal->accounting_period_id,
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);
        }, 3);
    }
}
