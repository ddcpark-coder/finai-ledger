<?php

namespace App\Application\Documents;

use App\Infrastructure\Documents\DocumentMailer;
use App\Infrastructure\Documents\SecureDocumentStore;
use Illuminate\Support\Facades\DB;

final class SendDocumentCopy
{
    public function __construct(
        private DocumentMailer $mailer,
        private SecureDocumentStore $store,
    ) {}

    public function execute(int $documentId, string $recipient): void
    {
        $document = DB::table('document_records')->find($documentId);
        if (! $document || $document->status !== 'final') {
            throw new \DomainException('Only final documents can be sent.');
        }

        if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            throw new \DomainException('Invalid recipient email.');
        }

        $result = $this->mailer->send(
            $recipient,
            $document->title,
            'V priponki je vaša elektronska kopija dokumenta.',
            [
                'disk' => $document->storage_disk,
                'path' => $document->storage_path,
                'mime_type' => $document->mime_type,
                'name' => $document->title.'.pdf',
            ],
        );

        DB::table('document_deliveries')->insert([
            'document_record_id' => $documentId,
            'channel' => 'email',
            'recipient' => $recipient,
            'status' => ($result['sent'] ?? false) ? 'sent' : 'failed',
            'provider_message_id' => $result['message_id'] ?? null,
            'error_message' => $result['error'] ?? null,
            'sent_at' => ($result['sent'] ?? false) ? now() : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
