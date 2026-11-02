<?php

namespace App\Application\IncomingInvoices;

use App\Infrastructure\Integrations\Documents\InvoiceExtractor;
use Illuminate\Support\Facades\DB;

final class ProcessIncomingInvoice
{
    public function __construct(private InvoiceExtractor $extractor) {}

    public function execute(int $invoiceId): void
    {
        DB::transaction(function () use ($invoiceId) {
            $invoice = DB::table('incoming_invoices')->lockForUpdate()->find($invoiceId);
            if (! $invoice || ! in_array($invoice->status, ['received', 'failed'], true)) {
                throw new \DomainException('Invoice is not available for processing.');
            }

            DB::table('incoming_invoices')->where('id', $invoiceId)->update([
                'status' => 'processing',
                'updated_at' => now(),
            ]);
        });

        $invoice = DB::table('incoming_invoices')->find($invoiceId);
        $document = DB::table('documents')->find($invoice->document_id);

        $extractionId = DB::table('document_extractions')->insertGetId([
            'document_id' => $document->id,
            'provider' => 'configured',
            'status' => 'running',
            'started_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $result = $this->extractor->extract($document->storage_disk, $document->storage_path, $document->mime_type);

            DB::transaction(function () use ($invoiceId, $extractionId, $result) {
                DB::table('document_extractions')->where('id', $extractionId)->update([
                    'status' => 'completed',
                    'raw_metadata' => json_encode($result['metadata'] ?? []),
                    'extracted_fields' => json_encode($result['fields'] ?? []),
                    'finished_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('incoming_invoices')->where('id', $invoiceId)->update([
                    'status' => 'review',
                    'extraction_confidence' => $result['confidence'] ?? null,
                    'updated_at' => now(),
                ]);
            });
        } catch (\Throwable $e) {
            DB::transaction(function () use ($invoiceId, $extractionId, $e) {
                DB::table('document_extractions')->where('id', $extractionId)->update([
                    'status' => 'failed',
                    'error_message' => mb_substr($e->getMessage(), 0, 4000),
                    'finished_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('incoming_invoices')->where('id', $invoiceId)->update([
                    'status' => 'failed',
                    'updated_at' => now(),
                ]);
            });

            throw $e;
        }
    }
}
