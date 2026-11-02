<?php

namespace App\Application\IncomingInvoices;

use App\Domain\IncomingInvoices\IncomingInvoiceValidator;
use Illuminate\Support\Facades\DB;

final class ApproveIncomingInvoice
{
    public function execute(int $invoiceId, int $userId): void
    {
        DB::transaction(function () use ($invoiceId, $userId) {
            $invoice = DB::table('incoming_invoices')->lockForUpdate()->find($invoiceId);
            if (! $invoice || $invoice->status !== 'review') {
                throw new \DomainException('Only invoices in review can be approved.');
            }

            IncomingInvoiceValidator::assertReadyForApproval((array) $invoice);

            $lines = DB::table('incoming_invoice_lines')
                ->where('incoming_invoice_id', $invoiceId)
                ->orderBy('line_no')
                ->get()
                ->map(fn ($line) => (array) $line)
                ->all();

            IncomingInvoiceValidator::assertTotals((array) $invoice, $lines);

            DB::table('incoming_invoices')->where('id', $invoiceId)->update([
                'status' => 'approved',
                'approved_by' => $userId,
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $invoice->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'incoming_invoice.approved',
                'entity_type' => 'incoming_invoice',
                'entity_id' => (string) $invoiceId,
                'metadata' => json_encode(['invoice_number' => $invoice->invoice_number]),
                'created_at' => now(),
            ]);
        });
    }
}
