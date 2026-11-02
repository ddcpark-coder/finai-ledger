<?php

namespace App\Application\IncomingInvoices;

use Illuminate\Support\Facades\DB;

final class SaveAccountingProposal
{
    public function execute(int $invoiceId, string $provider, array $proposal, ?float $confidence): int
    {
        return DB::transaction(function () use ($invoiceId, $provider, $proposal, $confidence) {
            $invoice = DB::table('incoming_invoices')->find($invoiceId);
            if (! $invoice) {
                throw new \DomainException('Incoming invoice not found.');
            }

            DB::table('accounting_proposals')
                ->where('incoming_invoice_id', $invoiceId)
                ->where('status', 'proposed')
                ->update(['status' => 'superseded', 'updated_at' => now()]);

            $id = DB::table('accounting_proposals')->insertGetId([
                'incoming_invoice_id' => $invoiceId,
                'provider' => $provider,
                'confidence' => $confidence,
                'proposal_json' => json_encode($proposal),
                'status' => 'proposed',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('incoming_invoices')->where('id', $invoiceId)->update([
                'accounting_confidence' => $confidence,
                'updated_at' => now(),
            ]);

            return $id;
        });
    }
}
