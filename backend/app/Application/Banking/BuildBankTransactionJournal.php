<?php

namespace App\Application\Banking;

use App\Domain\Accounting\BalanceCalculator;
use Illuminate\Support\Facades\DB;

final class BuildBankTransactionJournal
{
    public function execute(int $transactionId, int $userId, int $counterAccountId): int
    {
        return DB::transaction(function () use ($transactionId, $userId, $counterAccountId) {
            $transaction = DB::table('bank_transactions')->lockForUpdate()->find($transactionId);
            if (! $transaction) {
                throw new \DomainException('Bank transaction not found.');
            }

            if ($transaction->journal_id) {
                return (int) $transaction->journal_id;
            }

            $bankAccount = DB::table('bank_accounts')->find($transaction->bank_account_id);
            if (! $bankAccount || ! $bankAccount->ledger_account_id) {
                throw new \DomainException('Bank ledger account is not configured.');
            }

            foreach ([$bankAccount->ledger_account_id, $counterAccountId] as $accountId) {
                $valid = DB::table('accounts')
                    ->where('id', $accountId)
                    ->where('company_id', $bankAccount->company_id)
                    ->where('active', true)
                    ->where('postable', true)
                    ->exists();

                if (! $valid) {
                    throw new \DomainException('Invalid bank journal account.');
                }
            }

            $period = DB::table('accounting_periods as p')
                ->join('fiscal_years as y', 'y.id', '=', 'p.fiscal_year_id')
                ->where('y.company_id', $bankAccount->company_id)
                ->where('p.status', 'open')
                ->whereDate('p.starts_on', '<=', $transaction->booking_date)
                ->whereDate('p.ends_on', '>=', $transaction->booking_date)
                ->select('p.*', 'y.id as fiscal_year_id')
                ->first();

            if (! $period) {
                throw new \DomainException('No open accounting period for bank transaction.');
            }

            $amount = abs((float) $transaction->amount);
            $incoming = (float) $transaction->amount > 0;

            $journalId = DB::table('journals')->insertGetId([
                'company_id' => $bankAccount->company_id,
                'fiscal_year_id' => $period->fiscal_year_id,
                'accounting_period_id' => $period->id,
                'number' => 'BANK-'.$transaction->id,
                'posting_date' => $transaction->booking_date,
                'document_date' => $transaction->booking_date,
                'document_ref' => $transaction->reference,
                'description' => $transaction->description ?: 'Bančna transakcija '.$transaction->id,
                'status' => 'draft',
                'created_by' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $entries = [
                [
                    'journal_id' => $journalId,
                    'line_no' => 1,
                    'account_id' => $bankAccount->ledger_account_id,
                    'partner_id' => $transaction->partner_id,
                    'description' => 'Banka',
                    'debit' => $incoming ? $amount : 0,
                    'credit' => $incoming ? 0 : $amount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'journal_id' => $journalId,
                    'line_no' => 2,
                    'account_id' => $counterAccountId,
                    'partner_id' => $transaction->partner_id,
                    'description' => $transaction->counterparty_name ?: 'Protikonto',
                    'debit' => $incoming ? 0 : $amount,
                    'credit' => $incoming ? $amount : 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            BalanceCalculator::assertBalanced($entries);
            DB::table('journal_entries')->insert($entries);

            DB::table('bank_transactions')->where('id', $transactionId)->update([
                'journal_id' => $journalId,
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $bankAccount->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'bank_transaction.journal_prepared',
                'entity_type' => 'bank_transaction',
                'entity_id' => (string) $transactionId,
                'metadata' => json_encode(['journal_id' => $journalId]),
                'created_at' => now(),
            ]);

            return $journalId;
        });
    }
}
