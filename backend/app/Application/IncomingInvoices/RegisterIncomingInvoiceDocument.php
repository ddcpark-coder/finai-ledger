<?php

namespace App\Application\IncomingInvoices;

use Illuminate\Support\Facades\DB;

final class RegisterIncomingInvoiceDocument
{
    private const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'application/xml',
        'text/xml',
        'application/octet-stream',
    ];

    public function execute(
        int $companyId,
        int $userId,
        string $originalName,
        string $mimeType,
        int $sizeBytes,
        string $sha256,
        string $storageDisk,
        string $storagePath,
    ): int {
        if (! in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
            throw new \DomainException('Unsupported invoice document type.');
        }

        if ($sizeBytes < 1 || $sizeBytes > 50 * 1024 * 1024) {
            throw new \DomainException('Invoice document size is outside allowed range.');
        }

        if (! preg_match('/^[a-f0-9]{64}$/i', $sha256)) {
            throw new \DomainException('Invalid SHA-256 checksum.');
        }

        return DB::transaction(function () use (
            $companyId, $userId, $originalName, $mimeType, $sizeBytes,
            $sha256, $storageDisk, $storagePath
        ) {
            $duplicate = DB::table('documents')
                ->where('company_id', $companyId)
                ->where('sha256', strtolower($sha256))
                ->first();

            if ($duplicate) {
                throw new \DomainException('This document has already been uploaded.');
            }

            $documentId = DB::table('documents')->insertGetId([
                'company_id' => $companyId,
                'uploaded_by' => $userId,
                'kind' => 'incoming_invoice',
                'original_name' => $originalName,
                'mime_type' => $mimeType,
                'size_bytes' => $sizeBytes,
                'sha256' => strtolower($sha256),
                'storage_disk' => $storageDisk,
                'storage_path' => $storagePath,
                'status' => 'uploaded',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $invoiceId = DB::table('incoming_invoices')->insertGetId([
                'company_id' => $companyId,
                'document_id' => $documentId,
                'currency' => 'EUR',
                'status' => 'received',
                'source_type' => 'upload',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $companyId,
                'actor_user_id' => $userId,
                'event_type' => 'incoming_invoice.received',
                'entity_type' => 'incoming_invoice',
                'entity_id' => (string) $invoiceId,
                'metadata' => json_encode([
                    'document_id' => $documentId,
                    'original_name' => $originalName,
                    'size_bytes' => $sizeBytes,
                ]),
                'created_at' => now(),
            ]);

            return $invoiceId;
        });
    }
}
