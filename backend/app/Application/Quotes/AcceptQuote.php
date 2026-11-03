<?php

namespace App\Application\Quotes;

use Illuminate\Support\Facades\DB;

final class AcceptQuote
{
    public function execute(int $quoteId, string $publicToken): void
    {
        DB::transaction(function () use ($quoteId, $publicToken) {
            $quote = DB::table('quotes')->lockForUpdate()->find($quoteId);
            if (! $quote || ! in_array($quote->status, ['sent','viewed'], true)) {
                throw new \DomainException('Quote cannot be accepted in current state.');
            }

            if (! $quote->public_token_hash || ! hash_equals($quote->public_token_hash, hash('sha256', $publicToken))) {
                throw new \DomainException('Invalid quote access token.');
            }

            if ($quote->valid_until && now()->toDateString() > $quote->valid_until) {
                throw new \DomainException('Quote has expired.');
            }

            DB::table('quotes')->where('id',$quoteId)->update([
                'status'=>'accepted','accepted_at'=>now(),'updated_at'=>now()
            ]);

            DB::table('quote_events')->insert([
                'quote_id'=>$quoteId,'event_type'=>'accepted','occurred_at'=>now(),
                'created_at'=>now(),'updated_at'=>now()
            ]);
        });
    }
}
