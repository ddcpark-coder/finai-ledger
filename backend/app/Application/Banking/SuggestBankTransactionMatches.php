<?php

namespace App\Application\Banking;

use Illuminate\Support\Facades\DB;

final class SuggestBankTransactionMatches
{
    public function execute(int $transactionId): array
    {
        $transaction = DB::table('bank_transactions')->find($transactionId);
        if (! $transaction) {
            throw new \DomainException('Bank transaction not found.');
        }

        $bankAccount = DB::table('bank_accounts')->find($transaction->bank_account_id);
        if (! $bankAccount) {
            throw new \DomainException('Bank account not found.');
        }

        $isIncoming = (float) $transaction->amount > 0;
        $targetAmount = abs((float) $transaction->amount);

        $query = DB::table('open_items as o')
            ->leftJoin('partners as p', 'p.id', '=', 'o.partner_id')
            ->where('o.company_id', $bankAccount->company_id)
            ->whereIn('o.status', ['open', 'partial']);

        if ($transaction->partner_id) {
            $query->where('o.partner_id', $transaction->partner_id);
        }

        $candidates = $query->orderBy('o.due_date')->limit(50)->get([
            'o.id','o.partner_id','o.reference','o.open_amount','o.currency','o.due_date','p.name as partner_name'
        ]);

        return $candidates->map(function ($item) use ($transaction, $targetAmount, $isIncoming) {
            $score = 40.0;

            if (strtoupper($item->currency) === strtoupper($transaction->currency)) {
                $score += 15;
            }

            $amountDiff = abs((float) $item->open_amount - $targetAmount);
            if ($amountDiff < 0.01) {
                $score += 30;
            } elseif ($targetAmount > 0 && $amountDiff / $targetAmount <= 0.05) {
                $score += 15;
            }

            if ($transaction->reference && $item->reference &&
                str_contains(strtoupper($transaction->reference), strtoupper($item->reference))) {
                $score += 15;
            }

            return [
                'open_item_id' => $item->id,
                'partner_id' => $item->partner_id,
                'partner_name' => $item->partner_name,
                'reference' => $item->reference,
                'open_amount' => (string) $item->open_amount,
                'currency' => $item->currency,
                'direction' => $isIncoming ? 'receivable_payment' : 'payable_payment',
                'confidence' => min(100, $score),
            ];
        })->sortByDesc('confidence')->values()->all();
    }
}
