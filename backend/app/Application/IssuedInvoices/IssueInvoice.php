<?php

namespace App\Application\IssuedInvoices;

use App\Domain\IssuedInvoices\IssuedInvoiceValidator;
use Illuminate\Support\Facades\DB;

final class IssueInvoice
{
    public function __construct(private AllocateInvoiceNumber $numbering) {}

    public function execute(int $invoiceId, int $userId): void
    {
        DB::transaction(function () use ($invoiceId, $userId) {
            $invoice = DB::table('issued_invoices')->lockForUpdate()->find($invoiceId);
            if (! $invoice || $invoice->status !== 'draft') {
                throw new \DomainException('Only draft invoices can be issued.');
            }

            IssuedInvoiceValidator::assertReadyToIssue((array) $invoice);

            $lines = DB::table('issued_invoice_lines')
                ->where('issued_invoice_id', $invoiceId)
                ->orderBy('line_no')
                ->get()
                ->map(fn ($line) => (array) $line)
                ->all();

            IssuedInvoiceValidator::assertTotals((array) $invoice, $lines);

            $number = $invoice->number ?: $this->numbering->execute(
                $invoice->company_id,
                'sales_invoice',
                (int) substr((string) $invoice->issue_date, 0, 4),
            );

            DB::table('issued_invoices')->where('id', $invoiceId)->update([
                'number' => $number,
                'status' => 'issued',
                'issued_by' => $userId,
                'issued_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $invoice->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'issued_invoice.issued',
                'entity_type' => 'issued_invoice',
                'entity_id' => (string) $invoiceId,
                'metadata' => json_encode(['number' => $number]),
                'created_at' => now(),
            ]);
        });
    }
}
