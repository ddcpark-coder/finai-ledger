<?php

namespace App\Application\Banking;

use Illuminate\Support\Facades\DB;

final class ReconcileBankTransaction
{
    public function execute(int $transactionId, int $openItemId, string $amount, int $userId, ?float $confidence = null): void
    {
        DB::transaction(function () use ($transactionId, $openItemId, $amount, $userId, $confidence) {
            $transaction = DB::table('bank_transactions')->lockForUpdate()->find($transactionId);
            $openItem = DB::table('open_items')->lockForUpdate()->find($openItemId);

            if (! $transaction || ! $openItem) {
                throw new \DomainException('Transaction or open item not found.');
            }

            $bankAccount = DB::table('bank_accounts')->find($transaction->bank_account_id);
            if (! $bankAccount || $bankAccount->company_id !== $openItem->company_id) {
                throw new \DomainException('Cross-company reconciliation is not allowed.');
            }

            $matchAmount = round((float) $amount, 2);
            $available = abs((float) $transaction->amount);
            $open = abs((float) $openItem->open_amount);

            if ($matchAmount <= 0 || $matchAmount - $available > 0.001 || $matchAmount - $open > 0.001) {
                throw new \DomainException('Matched amount exceeds transaction or open item balance.');
            }

            DB::table('bank_transaction_matches')->updateOrInsert(
                ['bank_transaction_id' => $transactionId, 'open_item_id' => $openItemId],
                [
                    'matched_amount' => $matchAmount,
                    'confidence' => $confidence,
                    'source' => $confidence !== null ? 'suggested' : 'manual',
                    'matched_by' => $userId,
                    'matched_at' => now(),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            $matchedTotal = (float) DB::table('bank_transaction_matches')
                ->where('bank_transaction_id', $transactionId)
                ->sum('matched_amount');

            $itemMatchedTotal = (float) DB::table('bank_transaction_matches')
                ->where('open_item_id', $openItemId)
                ->sum('matched_amount');

            $remainingTransaction = max(0, $available - $matchedTotal);
            $remainingOpenItem = max(0, $open - $itemMatchedTotal);

            DB::table('bank_transactions')->where('id', $transactionId)->update([
                'status' => $remainingTransaction < 0.01 ? 'matched' : 'partial',
                'updated_at' => now(),
            ]);

            DB::table('open_items')->where('id', $openItemId)->update([
                'open_amount' => $remainingOpenItem,
                'status' => $remainingOpenItem < 0.01 ? 'closed' : 'partial',
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $bankAccount->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'bank_transaction.reconciled',
                'entity_type' => 'bank_transaction',
                'entity_id' => (string) $transactionId,
                'metadata' => json_encode([
                    'open_item_id' => $openItemId,
                    'matched_amount' => $matchAmount,
                    'remaining_transaction' => $remainingTransaction,
                    'remaining_open_item' => $remainingOpenItem,
                ]),
                'created_at' => now(),
            ]);
        });
    }
}
