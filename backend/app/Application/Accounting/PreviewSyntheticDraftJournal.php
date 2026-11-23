<?php

namespace App\Application\Accounting;

use App\Domain\Accounting\BalanceCalculator;
use Illuminate\Support\Facades\DB;

/**
 * NEXT26: read-only review of a real-schema synthetic DRAFT.
 * This does not authorize, stage or perform a journal posting.
 * Strictly blocked outside local/testing even when called without HTTP.
 */
final class PreviewSyntheticDraftJournal
{
    private const MAX_CENTS = 1_000_000_000_000;
    private const MAX_LINES = 100;

    public function execute(int $companyId, int $journalId, int $userId): array
    {
        if (! app()->environment('local', 'testing')
            || ! config('finai.synthetic_journal_preview_enabled', false)
            || $companyId < 1 || $journalId < 1 || $userId < 1) {
            throw new \DomainException('Synthetic journal preview unavailable.');
        }

        // Reuse the authorization required for actual posting, without posting.
        LedgerPostingGuard::requireWriter($companyId, $userId);

        return DB::transaction(function () use ($companyId, $journalId): array {
            $journal = DB::table('journals')->where('company_id', $companyId)
                ->where('id', $journalId)->first();
            if (! $journal || $journal->status !== 'draft'
                || ! is_string($journal->number)
                || ! preg_match('/^SYN-(?:INV|ORD|CRM)-[0-9]{1,12}$/D', $journal->number)
                || $journal->description !== 'Synthetic isolated journal'
                || $journal->reversal_of_id !== null) {
                throw new \DomainException('Only isolated synthetic drafts may be previewed.');
            }

            // Reuse core period, account, cost-centre, tax-code and double-entry guards.
            $period = LedgerPostingGuard::openPeriod(
                $companyId, (int) $journal->fiscal_year_id,
                (int) $journal->accounting_period_id
            );
            if ($journal->posting_date < $period->starts_on
                || $journal->posting_date > $period->ends_on) {
                throw new \DomainException('Synthetic draft is outside the open period.');
            }
            $entries = LedgerPostingGuard::journalEntries($companyId, $journalId);
            if (count($entries) < 2 || count($entries) > self::MAX_LINES) {
                throw new \DomainException('Invalid synthetic draft line count.');
            }

            $lines = [];
            $debit = 0;
            $credit = 0;
            foreach ($entries as $entry) {
                $account = DB::table('accounts')
                    ->where('company_id', $companyId)->where('id', $entry->account_id)
                    ->first(['code', 'name']);
                // Never allow a non-demo account into the projected response.
                if (! $account || ! preg_match('/^[0-9]{3,8}$/D', $account->code)
                    || $account->name !== 'Synthetic account '.$account->code) {
                    throw new \DomainException('Synthetic preview contains a non-demo account.');
                }

                $d = BalanceCalculator::toCents((string) $entry->debit);
                $c = BalanceCalculator::toCents((string) $entry->credit);
                if ($d < 0 || $c < 0 || $d > self::MAX_CENTS || $c > self::MAX_CENTS
                    || (($d === 0) === ($c === 0))) {
                    throw new \DomainException('Invalid synthetic entry amount.');
                }
                $debit += $d;
                $credit += $c;
                if ($debit > PHP_INT_MAX / 2 || $credit > PHP_INT_MAX / 2) {
                    throw new \DomainException('Synthetic preview total is too large.');
                }
                // Only fields accepted by the existing JS validator leave the server.
                // Never return descriptions, counterparties, open items or tax metadata.
                $lines[] = [
                    'accountId' => 'SYN-ACC-'.$account->code,
                    'debitCents' => $d,
                    'creditCents' => $c,
                ];
            }
            if ($debit === 0 || $debit !== $credit) {
                throw new \DomainException('Unbalanced synthetic preview.');
            }

            return [
                'companyId' => $companyId,
                'reference' => $journal->number,
                'currency' => 'EUR',
                'lines' => $lines,
                'totalDebitCents' => $debit,
                'totalCreditCents' => $credit,
                'postingAllowed' => false,
                'mode' => 'synthetic-preview-only',
            ];
        }, 1);
    }
}
