<?php

namespace App\Application\Quotes;

use Illuminate\Support\Facades\DB;

final class CreateQuoteRevision
{
    public function execute(int $quoteId, int $userId): int
    {
        return DB::transaction(function () use ($quoteId, $userId) {
            $quote = DB::table('quotes')->lockForUpdate()->find($quoteId);
            if (! $quote) throw new \DomainException('Quote not found.');

            $newId = DB::table('quotes')->insertGetId([
                'company_id'=>$quote->company_id,'partner_id'=>$quote->partner_id,'opportunity_id'=>$quote->opportunity_id,
                'number'=>$quote->number,'version'=>$quote->version + 1,'status'=>'draft',
                'issue_date'=>now()->toDateString(),'valid_until'=>$quote->valid_until,'currency'=>$quote->currency,
                'net_amount'=>$quote->net_amount,'tax_amount'=>$quote->tax_amount,'gross_amount'=>$quote->gross_amount,
                'notes'=>$quote->notes,'created_by'=>$userId,'created_at'=>now(),'updated_at'=>now()
            ]);

            foreach (DB::table('quote_lines')->where('quote_id',$quoteId)->orderBy('line_no')->get() as $line) {
                $data=(array)$line;
                unset($data['id']);
                $data['quote_id']=$newId;
                $data['created_at']=now(); $data['updated_at']=now();
                DB::table('quote_lines')->insert($data);
            }

            return $newId;
        });
    }
}
