<?php

namespace App\Application\Documents;

use Illuminate\Support\Facades\DB;

final class CompleteAndSendDeliveryNote
{
    public function __construct(
        private CompleteDeliveryNote $complete,
        private SendDocumentCopy $send,
    ) {}

    public function execute(int $deliveryNoteId, int $userId, array $receipt): int
    {
        $documentId = $this->complete->execute($deliveryNoteId, $userId, $receipt);

        $note = DB::table('delivery_notes')->find($deliveryNoteId);
        $recipient = $receipt['signer_email'] ?? $note?->recipient_email;

        if ($recipient) {
            $this->send->execute($documentId, $recipient);
        }

        return $documentId;
    }
}
