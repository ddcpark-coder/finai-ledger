<?php

namespace App\Application\Documents;

use App\Infrastructure\Documents\DeliveryNoteRenderer;
use App\Infrastructure\Documents\SecureDocumentStore;
use Illuminate\Support\Facades\DB;

final class CompleteDeliveryNote
{
    public function __construct(
        private DeliveryNoteRenderer $renderer,
        private SecureDocumentStore $store,
    ) {}

    public function execute(int $deliveryNoteId, int $userId, array $receipt): int
    {
        return DB::transaction(function () use ($deliveryNoteId, $userId, $receipt) {
            $note = DB::table('delivery_notes')->lockForUpdate()->find($deliveryNoteId);
            if (! $note || $note->status !== 'draft') {
                throw new \DomainException('Only draft delivery notes can be completed.');
            }

            foreach (['signer_name', 'signed_at'] as $field) {
                if (empty($receipt[$field])) {
                    throw new \DomainException("Missing receipt field: {$field}");
                }
            }

            $lines = DB::table('delivery_note_lines')
                ->where('delivery_note_id', $deliveryNoteId)
                ->orderBy('line_no')
                ->get();

            if ($lines->isEmpty()) {
                throw new \DomainException('Delivery note requires at least one line.');
            }

            $signatureType = $receipt['signature_type'] ?? 'drawn';
            if (! in_array($signatureType, ['drawn', 'qualified'], true)) {
                throw new \DomainException('Unsupported signature type.');
            }

            if ($signatureType === 'drawn' && empty($receipt['signature_data'])) {
                throw new \DomainException('Drawn signature data is required.');
            }

            if ($signatureType === 'qualified' && empty($receipt['qualified_signature_reference'])) {
                throw new \DomainException('Qualified signature reference is required.');
            }

            $receiptId = DB::table('delivery_receipts')->insertGetId([
                'delivery_note_id' => $deliveryNoteId,
                'signer_name' => trim($receipt['signer_name']),
                'signer_email' => $receipt['signer_email'] ?? $note->recipient_email,
                'signature_type' => $signatureType,
                'signature_data' => $signatureType === 'drawn' ? $receipt['signature_data'] : null,
                'signature_sha256' => isset($receipt['signature_data']) ? hash('sha256', $receipt['signature_data']) : null,
                'signed_at' => $receipt['signed_at'],
                'ip_address' => $receipt['ip_address'] ?? null,
                'device_info' => $receipt['device_info'] ?? null,
                'latitude' => $receipt['latitude'] ?? null,
                'longitude' => $receipt['longitude'] ?? null,
                'qualified_signature_reference' => $receipt['qualified_signature_reference'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $artifact = $this->renderer->render((array) $note, $lines, array_merge($receipt, ['receipt_id' => $receiptId]));
            $path = 'delivery-notes/'.$note->company_id.'/'.$deliveryNoteId.'/final.pdf';
            $stored = $this->store->put($path, $artifact['contents'], 'application/pdf');

            $documentId = DB::table('document_records')->insertGetId([
                'company_id' => $note->company_id,
                'document_type' => 'delivery_note',
                'title' => 'Dobavnica '.($note->number ?? $deliveryNoteId),
                'status' => 'final',
                'storage_disk' => $stored['disk'],
                'storage_path' => $stored['path'],
                'mime_type' => 'application/pdf',
                'size_bytes' => $stored['size_bytes'],
                'sha256' => $stored['sha256'],
                'version' => 1,
                'created_by' => $userId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('document_links')->insert([
                'document_record_id' => $documentId,
                'entity_type' => 'delivery_note',
                'entity_id' => $deliveryNoteId,
                'relation' => 'final_pdf',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('delivery_notes')->where('id', $deliveryNoteId)->update([
                'status' => 'completed',
                'completed_by' => $userId,
                'completed_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('audit_logs')->insert([
                'company_id' => $note->company_id,
                'actor_user_id' => $userId,
                'event_type' => 'delivery_note.completed',
                'entity_type' => 'delivery_note',
                'entity_id' => (string) $deliveryNoteId,
                'metadata' => json_encode([
                    'document_id' => $documentId,
                    'signature_type' => $signatureType,
                    'signer_name' => trim($receipt['signer_name']),
                ]),
                'created_at' => now(),
            ]);

            return $documentId;
        });
    }
}
